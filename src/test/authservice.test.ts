import { describe, it, expect, beforeEach, mock } from 'bun:test';

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
            resetPasswordUrl: 'http://localhost:3000/reset-password'
        }
    },
}));

import { AuthService } from '../modules/auth/authService';
import { UserService } from '../modules/users/userService';

// Mock UserService
const mockUserService = {
    getUserByEmailRaw: mock(),
    getUserByUsernameRaw: mock(),
    getUserByGithubId: mock(),
    createUser: mock(),
    getUserCountByUsername: mock(),
    getUserCountByEmail: mock(),
    getUserWithPassword: mock(),
    updatePassword: mock(),
} as unknown as UserService;

// Mock db for sessions
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));
const mockSessionFindFirst = mock();

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert,
            query: {
                sessions: {
                    findFirst: mockSessionFindFirst,
                }
            }
        }
    }
});

// Mock axios for GitHub OAuth
mock.module('axios', () => {
    return {
        default: {
            post: mock()
        }
    }
});

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService(mockUserService);
        mockReturning.mockReset();
        mockSessionFindFirst.mockReset();
        (mockUserService.getUserByEmailRaw as any).mockReset();
        (mockUserService.getUserByUsernameRaw as any).mockReset();
        (mockUserService.getUserByGithubId as any).mockReset();
        (mockUserService.createUser as any).mockReset();
        (mockUserService.getUserCountByUsername as any).mockReset();
        (mockUserService.getUserCountByEmail as any).mockReset();
        (mockUserService.getUserWithPassword as any).mockReset();
        (mockUserService.updatePassword as any).mockReset();
        process.env.JWT_SECRET = 'test-secret';
    });

    describe('signIn', () => {
        it('returns tokens for valid email credentials', async () => {
            const testEmail = 'test@example.com';
            const testPassword = 'password';
            const hashedPassword = await Bun.password.hash(testPassword, { algorithm: "bcrypt", cost: 4 });
            
            const mockUser = {
                id: 'user1',
                email: testEmail,
                password: hashedPassword,
                is_super_admin: false
            };

            (mockUserService.getUserByEmailRaw as any).mockResolvedValue(mockUser);
            mockReturning.mockResolvedValue([{ refresh_token: 'refresh-token' }]);

            const result = await authService.signIn(testEmail, testPassword, 'user-agent');

            expect(result).toHaveProperty('access_token');
            expect(result).toHaveProperty('refresh_token');
            expect(result.refresh_token).toBe('refresh-token');
            expect(mockUserService.getUserByEmailRaw).toHaveBeenCalledWith(testEmail);
            expect(mockInsert).toHaveBeenCalled();
        });

        it('returns tokens for valid username credentials', async () => {
            const testUsername = 'testuser';
            const testPassword = 'password';
            const hashedPassword = await Bun.password.hash(testPassword, { algorithm: "bcrypt", cost: 4 });
            
            const mockUser = {
                id: 'user1',
                email: 'test@example.com',
                username: testUsername,
                password: hashedPassword,
                is_super_admin: false
            };

            (mockUserService.getUserByUsernameRaw as any).mockResolvedValue(mockUser);
            mockReturning.mockResolvedValue([{ refresh_token: 'refresh-token' }]);

            const result = await authService.signIn(testUsername, testPassword, 'user-agent');

            expect(result).toHaveProperty('access_token');
            expect(result).toHaveProperty('refresh_token');
            expect(mockUserService.getUserByUsernameRaw).toHaveBeenCalledWith(testUsername);
        });

        it('throws error for invalid password', async () => {
            const testEmail = 'test@example.com';
            const testPassword = 'wrongpassword';
            const hashedPassword = await Bun.password.hash('password', { algorithm: "bcrypt", cost: 4 });
            
            const mockUser = {
                id: 'user1',
                email: testEmail,
                password: hashedPassword,
                is_super_admin: false
            };

            (mockUserService.getUserByEmailRaw as any).mockResolvedValue(mockUser);

            expect(authService.signIn(testEmail, testPassword, 'user-agent')).rejects.toThrow();
        });
        
        it('throws error if user not found', async () => {
            const testEmail = 'test@example.com';
            (mockUserService.getUserByEmailRaw as any).mockResolvedValue(undefined);
             
            expect(authService.signIn(testEmail, 'any', 'user-agent')).rejects.toThrow();
        });

        it('throws error if user has no password set', async () => {
            const testEmail = 'test@example.com';
            
            const mockUser = {
                id: 'user1',
                email: testEmail,
                password: null,
                is_super_admin: false
            };

            (mockUserService.getUserByEmailRaw as any).mockResolvedValue(mockUser);

            expect(authService.signIn(testEmail, 'any', 'user-agent')).rejects.toThrow();
        });
    });

    describe('signInWithGithub', () => {
        it('returns token for valid github user', async () => {
            const githubId = 12345;
            const mockUser = {
                id: 'user1',
                email: 'github@example.com',
                is_super_admin: false
            };

            (mockUserService.getUserByGithubId as any).mockResolvedValue(mockUser);

            const result = await authService.signInWithGithub(githubId);

            expect(result).toHaveProperty('access_token');
            expect(mockUserService.getUserByGithubId).toHaveBeenCalledWith(githubId);
        });

        it('throws NotFound if github user does not exist', async () => {
            const githubId = 99999;

            (mockUserService.getUserByGithubId as any).mockResolvedValue(null);

            expect(authService.signInWithGithub(githubId)).rejects.toThrow();
        });
    });

    describe('signUp', () => {
        it('creates user and returns token', async () => {
            const signupData = {
                email: 'new@example.com',
                password: 'password123',
                username: 'newuser',
                first_name: 'New',
                last_name: 'User'
            };

            const mockCreatedUser = {
                id: 'new-user-id',
                email: signupData.email,
                is_super_admin: false
            };

            (mockUserService.createUser as any).mockResolvedValue(mockCreatedUser);

            const result = await authService.signUp(signupData);

            expect(result).toHaveProperty('access_token');
            expect(mockUserService.createUser).toHaveBeenCalled();
        });
    });

    describe('checkUsername', () => {
        it('returns true if username exists', async () => {
            (mockUserService.getUserCountByUsername as any).mockResolvedValue(1);

            const result = await authService.checkUsername('existinguser');

            expect(result).toBe(true);
            expect(mockUserService.getUserCountByUsername).toHaveBeenCalledWith('existinguser');
        });

        it('returns false if username does not exist', async () => {
            (mockUserService.getUserCountByUsername as any).mockResolvedValue(0);

            const result = await authService.checkUsername('newuser');

            expect(result).toBe(false);
        });
    });

    describe('checkEmail', () => {
        it('returns true if email exists', async () => {
            (mockUserService.getUserCountByEmail as any).mockResolvedValue(1);

            const result = await authService.checkEmail('existing@example.com');

            expect(result).toBe(true);
        });

        it('returns false if email does not exist', async () => {
            (mockUserService.getUserCountByEmail as any).mockResolvedValue(0);

            const result = await authService.checkEmail('new@example.com');

            expect(result).toBe(false);
        });
    });

    describe('refreshToken', () => {
        it('returns new access token for valid refresh token', async () => {
            const validSession = {
                refresh_token: 'valid-refresh-token',
                expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
                user: {
                    id: 'user1',
                    email: 'test@example.com',
                    is_super_admin: false
                }
            };

            mockSessionFindFirst.mockResolvedValue(validSession);

            const result = await authService.refreshToken('valid-refresh-token');

            expect(result).toHaveProperty('access_token');
            expect(mockSessionFindFirst).toHaveBeenCalled();
        });

        it('throws Unauthorized for expired refresh token', async () => {
            const expiredSession = {
                refresh_token: 'expired-token',
                expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day in past
                user: {
                    id: 'user1',
                    email: 'test@example.com',
                    is_super_admin: false
                }
            };

            mockSessionFindFirst.mockResolvedValue(expiredSession);

            expect(authService.refreshToken('expired-token')).rejects.toThrow();
        });

        it('throws Unauthorized for non-existent refresh token', async () => {
            mockSessionFindFirst.mockResolvedValue(null);

            expect(authService.refreshToken('non-existent-token')).rejects.toThrow();
        });

        it('throws Unauthorized if session has no user', async () => {
            const sessionNoUser = {
                refresh_token: 'token',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                user: null
            };

            mockSessionFindFirst.mockResolvedValue(sessionNoUser);

            expect(authService.refreshToken('token')).rejects.toThrow();
        });
    });

    describe('updatePassword', () => {
        it('updates password for valid current password', async () => {
            const userId = 'user1';
            const currentPassword = 'oldpassword';
            const newPassword = 'newpassword';
            const hashedCurrentPassword = await Bun.password.hash(currentPassword, { algorithm: "bcrypt", cost: 4 });

            (mockUserService.getUserWithPassword as any).mockResolvedValue({
                id: userId,
                password: hashedCurrentPassword
            });
            (mockUserService.updatePassword as any).mockResolvedValue([{ id: userId }]);

            const result = await authService.updatePassword(currentPassword, newPassword, userId);

            expect(result).toBeDefined();
            expect(mockUserService.updatePassword).toHaveBeenCalled();
        });

        it('throws error for invalid current password', async () => {
            const userId = 'user1';
            const currentPassword = 'wrongpassword';
            const newPassword = 'newpassword';
            const hashedPassword = await Bun.password.hash('correctpassword', { algorithm: "bcrypt", cost: 4 });

            (mockUserService.getUserWithPassword as any).mockResolvedValue({
                id: userId,
                password: hashedPassword
            });

            expect(authService.updatePassword(currentPassword, newPassword, userId)).rejects.toThrow();
        });

        it('throws error if user not found', async () => {
            (mockUserService.getUserWithPassword as any).mockResolvedValue(null);

            expect(authService.updatePassword('any', 'any', 'user1')).rejects.toThrow();
        });
    });
});
