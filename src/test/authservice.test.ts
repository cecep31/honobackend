import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, setupTransactionMock, mockTxInsert } from './helpers/drizzleMock';

// Mock Config - Must be before other imports that use config
mock.module('../config', () => ({
  default: {
    jwt: {
      secret: 'test-secret',
      expiresIn: '1d',
    },
    github: {
      CLIENT_ID: 'test-id',
      CLIENT_SECRET: 'test-secret',
      REDIRECT_URI: 'test-uri',
    },
    frontend: {
      resetPasswordUrl: 'http://localhost:3000/reset-password',
    },
  },
}));

// Create mocks using helper
const mocks = createDrizzleMocks();
const mockSessionFindFirst = mock();
const mockUserFindFirst = mock();
const mockUserCount = mock();
const mockFrom = mock(() => ({ where: mockUserCount }));

// Setup transaction mock
setupTransactionMock(mocks, {
  sessions: {
    findFirst: mockSessionFindFirst,
  },
  users: {
    findFirst: mockUserFindFirst,
  },
});

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      transaction: mocks.mockTransaction,
      query: {
        sessions: {
          findFirst: mockSessionFindFirst,
        },
        users: {
          findFirst: mockUserFindFirst,
        },
      },
      select: mock(() => ({ from: mockFrom })),
    },
  };
});

import { authService } from '../services';

// Mock axios for GitHub OAuth
mock.module('axios', () => {
  return {
    default: {
      post: mock(),
    },
  };
});

describe('AuthService', () => {
  beforeEach(() => {
    mocks.reset();
    mockSessionFindFirst.mockReset();
    mockUserFindFirst.mockReset();
    mockUserCount.mockReset();
    mockFrom.mockClear();
    process.env.JWT_SECRET = 'test-secret';
    mock(Bun.password, 'verifySync').mockReturnValue(true);
    // Default returning value to avoid "undefined is not an object" error when accessing [0]
    mocks.mockReturning.mockResolvedValue([{}]);
  });

  describe('signIn', () => {
    it('returns tokens for valid email credentials', async () => {
      const testEmail = 'test@example.com';
      const testPassword = 'password';
      const hashedPassword = await Bun.password.hash(testPassword, {
        algorithm: 'bcrypt',
        cost: 4,
      });

      const mockUser = {
        id: 'user1',
        email: testEmail,
        password: hashedPassword,
        is_super_admin: false,
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await authService.signIn(testEmail, testPassword, 'user-agent');
      const insertValuesMock = mockTxInsert.mock.results[0]?.value?.values;
      const insertedSession = insertValuesMock?.mock.calls[0]?.[0];

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
      expect(result.refresh_token.length).toBeGreaterThan(10);
      expect(insertedSession?.refresh_token).not.toBe(result.refresh_token);
      expect(mockUserFindFirst).toHaveBeenCalled();
      expect(mockTxInsert).toHaveBeenCalled();
    });

    it('returns tokens for valid username credentials', async () => {
      const testUsername = 'testuser';
      const testPassword = 'password';
      const hashedPassword = await Bun.password.hash(testPassword, {
        algorithm: 'bcrypt',
        cost: 4,
      });

      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        username: testUsername,
        password: hashedPassword,
        is_super_admin: false,
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await authService.signIn(testUsername, testPassword, 'user-agent');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
      expect(mockUserFindFirst).toHaveBeenCalled();
    });

    it('throws error for invalid password', async () => {
      const testEmail = 'test@example.com';
      const testPassword = 'wrongpassword';
      const hashedPassword = await Bun.password.hash('password', { algorithm: 'bcrypt', cost: 4 });

      const mockUser = {
        id: 'user1',
        email: testEmail,
        password: hashedPassword,
        is_super_admin: false,
      };

      mockUserFindFirst.mockResolvedValue(mockUser);
      mock(Bun.password, 'verifySync').mockReturnValue(false);

      await expect(authService.signIn(testEmail, testPassword, 'user-agent')).rejects.toThrow();
    });

    it('throws error if user not found', async () => {
      const testEmail = 'test@example.com';
      mockUserFindFirst.mockResolvedValue(undefined);

      await expect(authService.signIn(testEmail, 'any', 'user-agent')).rejects.toThrow();
    });

    it('throws error if user has no password set', async () => {
      const testEmail = 'test@example.com';

      const mockUser = {
        id: 'user1',
        email: testEmail,
        password: null,
        is_super_admin: false,
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      await expect(authService.signIn(testEmail, 'any', 'user-agent')).rejects.toThrow();
    });
  });

  describe('signInWithGithub', () => {
    it('returns token for valid github user', async () => {
      const githubUser = {
        id: 12345,
        login: 'testghuser',
        email: 'github@example.com',
        avatar_url: 'https://example.com/avatar.png',
      };
      const mockUser = {
        id: 'user1',
        email: 'github@example.com',
        is_super_admin: false,
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await authService.signInWithGithub(githubUser);

      expect(result).toHaveProperty('access_token');
      expect(mockUserFindFirst).toHaveBeenCalled();
    });

    it('throws NotFound if github user does not exist', async () => {
      const githubUser = { id: 99999, login: 'notfound' };

      mockUserFindFirst.mockResolvedValue(null);

      await expect(authService.signInWithGithub(githubUser)).rejects.toThrow();
    });
  });

  describe('signUp', () => {
    it('creates user and returns token', async () => {
      const signupData = {
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
        first_name: 'New',
        last_name: 'User',
      };

      const mockCreatedUser = {
        id: 'new-user-id',
        email: signupData.email,
        is_super_admin: false,
      };

      // Setup sequence for returning values in transaction
      mocks.mockReturning.mockResolvedValueOnce([mockCreatedUser]);

      const result = await authService.signUp(signupData);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockTxInsert).toHaveBeenCalled();
    });
  });

  describe('checkUsername', () => {
    it('returns true if username exists', async () => {
      mockUserCount.mockResolvedValue([{ count: 1 }]);

      const result = await authService.checkUsername('existinguser');

      expect(result).toBe(true);
    });

    it('returns false if username does not exist', async () => {
      mockUserCount.mockResolvedValue([{ count: 0 }]);

      const result = await authService.checkUsername('newuser');

      expect(result).toBe(false);
    });
  });

  describe('checkEmail', () => {
    it('returns true if email exists', async () => {
      mockUserCount.mockResolvedValue([{ count: 1 }]);

      const result = await authService.checkEmail('existing@example.com');

      expect(result).toBe(true);
    });

    it('returns false if email does not exist', async () => {
      mockUserCount.mockResolvedValue([{ count: 0 }]);

      const result = await authService.checkEmail('new@example.com');

      expect(result).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('returns new access token and rotates refresh token', async () => {
      const validSession = {
        refresh_token: 'stored-hashed-refresh-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
        user: {
          id: 'user1',
          email: 'test@example.com',
          is_super_admin: false,
        },
      };

      mockSessionFindFirst.mockResolvedValue(validSession);

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.refresh_token).not.toBe('valid-refresh-token');
      expect(mockSessionFindFirst).toHaveBeenCalled();
    });

    it('throws Unauthorized for expired refresh token', async () => {
      const expiredSession = {
        refresh_token: 'expired-token',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day in past
        user: {
          id: 'user1',
          email: 'test@example.com',
          is_super_admin: false,
        },
      };

      mockSessionFindFirst.mockResolvedValue(expiredSession);

      await expect(authService.refreshToken('expired-token')).rejects.toThrow();
    });

    it('throws Unauthorized for non-existent refresh token', async () => {
      mockSessionFindFirst.mockResolvedValue(null);

      await expect(authService.refreshToken('non-existent-token')).rejects.toThrow();
    });

    it('throws Unauthorized if session has no user', async () => {
      const sessionNoUser = {
        refresh_token: 'token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        user: null,
      };

      mockSessionFindFirst.mockResolvedValue(sessionNoUser);

      await expect(authService.refreshToken('token')).rejects.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('updates password for valid current password', async () => {
      const userId = 'user1';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';
      const hashedCurrentPassword = await Bun.password.hash(currentPassword, {
        algorithm: 'bcrypt',
        cost: 4,
      });

      mockUserFindFirst.mockResolvedValue({
        id: userId,
        password: hashedCurrentPassword,
      });
      mocks.mockReturning.mockResolvedValue([{ id: userId }]);

      const result = await authService.updatePassword(currentPassword, newPassword, userId);

      expect(result).toBeDefined();
    });

    it('throws error for invalid current password', async () => {
      const userId = 'user1';
      const currentPassword = 'wrongpassword';
      const newPassword = 'newpassword';
      const hashedPassword = await Bun.password.hash('correctpassword', {
        algorithm: 'bcrypt',
        cost: 4,
      });

      mockUserFindFirst.mockResolvedValue({
        id: userId,
        password: hashedPassword,
      });
      mock(Bun.password, 'verifySync').mockReturnValue(false);

      await expect(
        authService.updatePassword(currentPassword, newPassword, userId)
      ).rejects.toThrow();
    });

    it('throws error if user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(authService.updatePassword('any', 'any', 'user1')).rejects.toThrow();
    });
  });
});
