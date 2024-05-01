
import { describe, it, expect, beforeEach, afterEach  } from 'bun:test'
import UserService from '../pkg/services/userServices'
import { PrismaClient } from '@prisma/client'

describe('userservice', () => {
    let db: PrismaClient;
    let userservice: UserService;

    beforeEach(() => {
        db = new PrismaClient();
        userservice = new UserService(db);
    });

    afterEach(async () => {
        await db.$disconnect();
    });
    it('getUsers', async () => {
        const users = await userservice.getUsers()
        expect(users.length).toBeGreaterThanOrEqual(1)
    })
})