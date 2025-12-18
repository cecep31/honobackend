import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthService } from '../pkg/services/authService';
import { UserService } from '../pkg/services/userService';

// Mock UserService
const mockUserService = {
    getUserByEmailRaw: mock(),
    getUserByUsernameRaw: mock(),
} as unknown as UserService;

// Mock db for sessions
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert
        }
    }
});

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService(mockUserService);
        mockReturning.mockReset();
        (mockUserService.getUserByEmailRaw as any).mockReset();
        process.env.JWT_SECRET = 'test-secret';
    });

    it('signIn returns tokens for valid credentials', async () => {
        const testEmail = 'test@example.com';
        const testPassword = 'password';
        const hashedPassword = await Bun.password.hash(testPassword, { algorithm: "bcrypt", cost: 4 });
        
        const mockUser = {
            id: 'user1',
            email: testEmail,
            password: hashedPassword,
            is_super_admin: false
        };

        // Mock userService response
        (mockUserService.getUserByEmailRaw as any).mockResolvedValue(mockUser);
        
        // Mock db session insert response
        mockReturning.mockResolvedValue([{ refresh_token: 'refresh-token' }]);

        const result = await authService.signIn(testEmail, testPassword, 'user-agent');

        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('refresh_token');
        expect(result.refresh_token).toBe('refresh-token');
        expect(mockUserService.getUserByEmailRaw).toHaveBeenCalledWith(testEmail);
        expect(mockInsert).toHaveBeenCalled();
    });

    it('signIn throws error for invalid credentials', async () => {
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

        // Expect it to throw
        // Bun test expect(...).rejects.toThrow()
        expect(authService.signIn(testEmail, testPassword, 'user-agent')).rejects.toThrow();
    });
    
    it('signIn throws error if user not found', async () => {
        const testEmail = 'test@example.com';
         (mockUserService.getUserByEmailRaw as any).mockResolvedValue(undefined);
         
         expect(authService.signIn(testEmail, 'any', 'user-agent')).rejects.toThrow();
    });
});
