
import { describe, it, expect,  } from 'bun:test'
import UserService from '../pkg/services/userServices'
import { PrismaClient } from '@prisma/client'

describe('userservice', () => {
    it('getUsers', async () => {
        const database = new PrismaClient()
        const userservice = new UserService(database)
        const users = await userservice.getUsers()
        expect(users.length).toBeGreaterThanOrEqual(1)
    })
})