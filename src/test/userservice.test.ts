
import { describe, it, expect, beforeEach, afterEach  } from 'bun:test'
import { UserService } from '../pkg/services/userService'
import { userRepository } from '../pkg/repository'

describe('userservice', () => {
    let userservice: UserService;

    beforeEach(() => {
        userservice = new UserService(userRepository);
    });

    // afterEach(async () => {
    //     await db.$disconnect();
    // });
    it('getUsers', async () => {
        const result = await userservice.getUsers()
        expect(result.data.length).toBeGreaterThanOrEqual(1)
    })
})