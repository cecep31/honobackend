
import { describe, it, expect, beforeEach, afterEach  } from 'bun:test'
import UserService from '../pkg/services/userServices'

describe('userservice', () => {
    let userservice: UserService;

    beforeEach(() => {
        userservice = new UserService();
    });

    // afterEach(async () => {
    //     await db.$disconnect();
    // });
    it('getUsers', async () => {
        const users = await userservice.getUsers()
        expect(users.length).toBeGreaterThanOrEqual(1)
    })
})