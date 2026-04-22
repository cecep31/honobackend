import { deleteCookie, setCookie } from 'hono/cookie';
import { Hono } from 'hono';
import config from '../../../config';
import { auth } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { GithubUser } from '../../../types/auth';
import type { Variables } from '../../../types/context';
import { Errors } from '../../../utils/error';
import { externalApiClient } from '../../../utils/httpClient';
import { getPaginationMetadata } from '../../../utils/paginate';
import { getClientIp } from '../../../utils/request';
import { createRateLimiter } from '../../../utils/rateLimiter';
import { parseExpiresIn } from '../../../utils/jwt';
import { sendSuccess } from '../../../utils/response';
import {
  activityLogsQuerySchema,
  activityLogsRecentQuerySchema,
  checkUsernameSchema,
  emailSchema,
  failedLoginsQuerySchema,
  forgotPasswordSchema,
  githubCallbackQuerySchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '../validation';

type AuthService = AppServices['authService'];
type UserService = AppServices['userService'];
type ActivityService = AppServices['activityService'];

export const createAuthController = (
  authService: AuthService,
  userService: UserService,
  activityService: ActivityService
) => {
  const authController = new Hono<{ Variables: Variables }>();

  authController.get('/oauth/github', async (c) => {
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', config.github.clientId);
    authUrl.searchParams.append('redirect_uri', config.github.redirectUri);
    authUrl.searchParams.append('scope', 'user:email');
    return c.redirect(authUrl.toString());
  });

  authController.get(
    '/oauth/github/callback',
    validateRequest('query', githubCallbackQuerySchema),
    async (c) => {
      const { code } = c.req.valid('query');
      const token = await authService.getGithubToken(code);

      try {
        const userResponse = await externalApiClient.get<GithubUser>(
          'https://api.github.com/user',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const githubUserData = userResponse.data;
        if (!githubUserData.email) {
          try {
            const emailsResponse = await externalApiClient.get<
              Array<{ email: string; primary: boolean; verified: boolean }>
            >('https://api.github.com/user/emails', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            const primaryEmail = emailsResponse.data.find((e) => e.primary && e.verified);
            const verifiedEmail = emailsResponse.data.find((e) => e.verified);
            if (primaryEmail) {
              githubUserData.email = primaryEmail.email;
            } else if (verifiedEmail) {
              githubUserData.email = verifiedEmail.email;
            }
          } catch (emailError) {
            console.warn('Could not fetch GitHub email:', emailError);
          }
        }

        const ipAddress = getClientIp(c);
        const userAgent = c.req.header('User-Agent');
        const jwtToken = await authService.signInWithGithub(githubUserData, ipAddress, userAgent);
        setCookie(c, 'token', jwtToken.access_token, {
          domain: `.${config.frontend.mainDomain}`,
          maxAge: parseExpiresIn(config.jwt.expiresIn),
          sameSite: 'Strict',
        });
        return c.redirect(config.frontend.url);
      } catch (error) {
        console.error('Github OAuth error:', error);
        if (error instanceof Error && error.message.includes('already registered')) {
          throw Errors.BusinessRuleViolation(error.message);
        }
        throw Errors.Unauthorized();
      }
    }
  );

  authController.post(
    '/login',
    createRateLimiter(15 * 60 * 1000, 7),
    validateRequest('json', loginSchema),
    async (c) => {
      const body = c.req.valid('json');
      const { identifier, email, password } = body;
      const loginIdentifier = identifier ?? email ?? '';
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header('User-Agent');
      const token = await authService.signIn(loginIdentifier, password, userAgent ?? '', ipAddress);
      return sendSuccess(c, token, 'Login successful');
    }
  );

  authController.post(
    '/register',
    createRateLimiter(15 * 60 * 1000, 5),
    validateRequest('json', registerSchema),
    async (c) => {
      const body = c.req.valid('json');
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header('User-Agent');
      const token = await authService.signUp(body, ipAddress, userAgent);
      return sendSuccess(c, token, 'User registered successfully', 201);
    }
  );

  authController.post(
    '/check-username',
    createRateLimiter(15 * 60 * 1000, 30),
    validateRequest('json', checkUsernameSchema),
    async (c) => {
      const { username } = c.req.valid('json');
      const exists = await authService.checkUsername(username);
      return sendSuccess(c, { exists }, 'Username check completed');
    }
  );

  authController.get(
    '/email/:email',
    createRateLimiter(15 * 60 * 1000, 10),
    validateRequest('param', emailSchema),
    async (c) => {
      const email = c.req.valid('param').email;
      const exists = await authService.checkEmail(email);
      return sendSuccess(c, { exists }, 'Email check completed');
    }
  );

  authController.post(
    '/refresh-token',
    createRateLimiter(15 * 60 * 1000, 10),
    validateRequest('json', refreshTokenSchema),
    async (c) => {
      const { refresh_token: refreshToken } = c.req.valid('json');
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header('User-Agent');
      const result = await authService.refreshToken(refreshToken, ipAddress, userAgent);
      return sendSuccess(c, result, 'Token refreshed successfully');
    }
  );

  authController.post(
    '/forgot-password',
    createRateLimiter(15 * 60 * 1000, 3),
    validateRequest('json', forgotPasswordSchema),
    async (c) => {
      const { email } = c.req.valid('json');
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header('User-Agent');
      const result = await authService.requestPasswordReset(email, ipAddress, userAgent);
      const message = 'If the email exists, a password reset link has been sent';
      const data = Object.keys(result).length > 0 ? { message, ...result } : { message };
      return sendSuccess(c, data, message);
    }
  );

  authController.post(
    '/reset-password',
    createRateLimiter(15 * 60 * 1000, 5),
    validateRequest('json', resetPasswordSchema),
    async (c) => {
      const body = c.req.valid('json');
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header('User-Agent');
      const result = await authService.resetPassword(
        body.token,
        body.new_password,
        ipAddress,
        userAgent
      );
      return sendSuccess(c, result, result.message);
    }
  );

  authController.post('/logout', auth, async (c) => {
    deleteCookie(c, 'token', {
      ...(config.frontend.mainDomain && { domain: config.frontend.mainDomain }),
      path: '/',
    });
    return sendSuccess(c, null, 'Logged out successfully');
  });

  authController.get('/profile', auth, async (c) => {
    const user = c.get('user');
    const userProfile = await userService.getUserProfile(user.user_id);
    if (!userProfile) {
      throw Errors.NotFound('User');
    }
    return sendSuccess(c, userProfile, 'User profile retrieved successfully');
  });

  authController.patch(
    '/password',
    auth,
    validateRequest('json', updatePasswordSchema),
    async (c) => {
      const body = c.req.valid('json');
      const user = c.get('user');
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header('User-Agent');
      const result = await authService.updatePassword(
        body.old_password,
        body.new_password,
        user.user_id,
        ipAddress,
        userAgent
      );
      return sendSuccess(c, result, 'Password updated successfully');
    }
  );

  authController.get(
    '/activity-logs',
    auth,
    validateRequest('query', activityLogsQuerySchema),
    async (c) => {
      const user = c.get('user');
      const { limit, offset, activity_type, status } = c.req.valid('query');

      const logs = await activityService.getActivityLogs({
        userId: user.user_id,
        activityType: activity_type,
        status: status ?? undefined,
        limit,
        offset,
      });

      const total = await activityService.getActivityLogsCount({
        userId: user.user_id,
        activityType: activity_type,
        status: status ?? undefined,
      });

      return sendSuccess(
        c,
        logs,
        'Activity logs retrieved successfully',
        200,
        getPaginationMetadata(total, offset, limit)
      );
    }
  );

  authController.get(
    '/activity-logs/recent',
    auth,
    validateRequest('query', activityLogsRecentQuerySchema),
    async (c) => {
      const user = c.get('user');
      const { limit } = c.req.valid('query');
      const logs = await activityService.getUserRecentActivity(user.user_id, limit);
      return sendSuccess(c, logs, 'Recent activity retrieved successfully');
    }
  );

  authController.get(
    '/activity-logs/failed-logins',
    auth,
    validateRequest('query', failedLoginsQuerySchema),
    async (c) => {
      const user = c.get('user');
      const { since } = c.req.valid('query');
      const logs = await activityService.getFailedLoginAttempts(user.user_id, since);
      return sendSuccess(
        c,
        { logs, count: logs.length },
        'Failed login attempts retrieved successfully'
      );
    }
  );

  return authController;
};
