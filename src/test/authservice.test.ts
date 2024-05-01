import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import AuthService from '../pkg/services/authService';
import { PrismaClient } from '@prisma/client';

describe('AuthService', () => {
    const testEmail = 'guest@pilput.dev';
    const testPassword = 'guestguest';
    let db: PrismaClient;
    let authService: AuthService;

    beforeEach(() => {
        db = new PrismaClient();
        authService = new AuthService(db);
    });

    afterEach(async () => {
        await db.$disconnect();
    });

    it('signs in a user with valid credentials', async () => {
        const token = await authService.signIn(testEmail, testPassword);
        expect(token).toHaveProperty('access_token');
    });
});
