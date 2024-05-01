import { describe, it, expect } from 'bun:test'
import AuthService from '../pkg/services/authService'
import { PrismaClient } from '@prisma/client'

describe('authservice', () => {
    it('signin', async () => {
        const database = new PrismaClient()
        const authService = new AuthService(database)
        const token = await authService.signIn('guest@pilput.dev', 'guestguest')
        expect(token).toEqual({ access_token: expect.any(String) });
    })
})