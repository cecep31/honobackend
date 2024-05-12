import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import AuthService from '../pkg/services/authService';

describe('AuthService', () => {
    const testEmail = 'guest@pilput.dev';
    const testPassword = 'guestguest';
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
    });

    // afterEach(async () => {
    //     await db.$disconnect();
    // });

    it('signs in a user with valid credentials', async () => {
        const token = await authService.signIn(testEmail, testPassword);
        expect(token).toHaveProperty('access_token');
    });
});
