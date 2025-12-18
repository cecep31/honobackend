import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { UserService } from '../pkg/services/userService';

// specific mocks we can control
const mockFindMany = mock();
const mockFindFirst = mock();
const mockWhere = mock();
const mockFrom = mock(() => ({ where: mockWhere }));
const mockSelect = mock(() => ({ from: mockFrom }));
const mockReturning = mock();
const mockSet = mock(() => ({ where: mock(() => ({ returning: mockReturning })) }));
const mockUpdate = mock(() => ({ set: mockSet }));

// Mock the db module
mock.module('../database/drizzle', () => {
    return {
        db: {
            query: {
                users: {
                    findMany: mockFindMany,
                    findFirst: mockFindFirst,
                }
            },
            select: mockSelect,
            update: mockUpdate,
        }
    }
});

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        userService = new UserService();
        mockFindMany.mockReset();
        mockFindFirst.mockReset();
        mockWhere.mockReset();
        mockReturning.mockReset();
    });

    it('getUsers returns data and meta', async () => {
        const mockData = [{ id: '1', username: 'user1' }];
        const mockCount = [{ count: 1 }];

        mockFindMany.mockResolvedValue(mockData);
        mockWhere.mockResolvedValue(mockCount);

        const result = await userService.getUsers({ limit: 10, offset: 0 });

        expect(result.data).toEqual(mockData);
        expect(result.meta).toBeDefined();
        expect(result.meta.total_items).toBe(1);
        expect(mockFindMany).toHaveBeenCalled();
        expect(mockSelect).toHaveBeenCalled();
    });

    it('gerUser returns a user', async () => {
        const mockUser = { id: '1', username: 'user1' };
        mockFindFirst.mockResolvedValue(mockUser);

        const result = await userService.gerUser('1');

        expect(result).toEqual(mockUser);
        expect(mockFindFirst).toHaveBeenCalled();
    });

    it('deleteUser soft deletes a user', async () => {
        const mockUser = { id: '1', username: 'user1' };
        mockFindFirst.mockResolvedValue(mockUser);
        mockReturning.mockResolvedValue([{ id: '1' }]);

        const result = await userService.deleteUser('1');

        expect(result).toEqual([{ id: '1' }]);
        expect(mockUpdate).toHaveBeenCalled();
    });
});
