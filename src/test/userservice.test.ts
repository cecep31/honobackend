import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { UserService } from '../modules/users/services/userService';

// specific mocks we can control
const mockFindMany = mock();
const mockFindFirst = mock();
const mockWhere = mock();
const mockFrom = mock(() => ({ where: mockWhere }));
const mockSelect = mock(() => ({ from: mockFrom }));
const mockReturning = mock();
const mockSet = mock(() => ({ where: mock(() => ({ returning: mockReturning })) }));
const mockUpdate = mock(() => ({ set: mockSet }));
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));

// Mock the db module
mock.module('../database/drizzle', () => {
    return {
        db: {
            query: {
                users: {
                    findMany: mockFindMany,
                    findFirst: mockFindFirst,
                },
                user_follows: {
                    findFirst: mockFindFirst,
                }
            },
            select: mockSelect,
            update: mockUpdate,
            insert: mockInsert,
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
        mockInsert.mockClear();
        mockValues.mockClear();
    });

    afterEach(() => {
        mockUpdate.mockImplementation(() => ({ set: mockSet }));
    });

    describe('getUsers', () => {
        it('returns data and meta', async () => {
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

        it('uses default pagination params', async () => {
            mockFindMany.mockResolvedValue([]);
            mockWhere.mockResolvedValue([{ count: 0 }]);

            const result = await userService.getUsers();

            expect(result.data).toEqual([]);
            expect(result.meta).toBeDefined();
        });

        it('handles empty results', async () => {
            mockFindMany.mockResolvedValue([]);
            mockWhere.mockResolvedValue([{ count: 0 }]);

            const result = await userService.getUsers({ limit: 10, offset: 0 });

            expect(result.data).toHaveLength(0);
            expect(result.meta.total_items).toBe(0);
        });
    });

    describe('getUser', () => {
        it('returns a user', async () => {
            const mockUser = { id: '1', username: 'user1' };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUser('1');

            expect(result).toEqual(mockUser);
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns null if user not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUser('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('getUserMe', () => {
        it('returns user without profile by default', async () => {
            const mockUser = { id: '1', username: 'user1', email: 'user@test.com' };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserMe('1');

            expect(result).toEqual(mockUser);
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns user with profile when requested', async () => {
            const mockUser = { 
                id: '1', 
                username: 'user1', 
                profiles: { bio: 'Test bio', website: 'https://example.com' } 
            };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserMe('1', true);

            expect(result).toHaveProperty('profiles');
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns null if user not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUserMe('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('deleteUser', () => {
        it('soft deletes a user', async () => {
            const mockUser = { id: '1', username: 'user1' };
            mockFindFirst.mockResolvedValue(mockUser);
            mockReturning.mockResolvedValue([{ id: '1' }]);

            const result = await userService.deleteUser('1');

            expect(result).toEqual({ id: '1' });
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('throws NotFound if user does not exist', async () => {
            mockFindFirst.mockResolvedValue(null);

            expect(userService.deleteUser('non-existent')).rejects.toThrow();
        });
    });

    describe('addUser', () => {
        it('creates a new user with hashed password', async () => {
            const userData = {
                first_name: 'John',
                last_name: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'password123',
                image: 'https://example.com/avatar.jpg',
                is_super_admin: false
            };

            // Mock username and email count checks
            mockWhere.mockResolvedValueOnce([{ count: 0 }]); // username check
            mockWhere.mockResolvedValueOnce([{ count: 0 }]); // email check
            mockReturning.mockResolvedValue([{ id: 'new-user-id' }]);

            const result = await userService.addUser(userData);

            expect(result).toHaveProperty('id', 'new-user-id');
            expect(mockInsert).toHaveBeenCalled();
        });

        it('creates a super admin user when specified', async () => {
            const userData = {
                first_name: 'Admin',
                last_name: 'User',
                username: 'admin',
                email: 'admin@example.com',
                password: 'adminpass',
                image: '/images/default.jpg',
                is_super_admin: true
            };

            // Mock username and email count checks
            mockWhere.mockResolvedValueOnce([{ count: 0 }]); // username check
            mockWhere.mockResolvedValueOnce([{ count: 0 }]); // email check
            mockReturning.mockResolvedValue([{ id: 'admin-id', is_super_admin: true }]);

            const result = await userService.addUser(userData);

            expect(result).toHaveProperty('id');
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe('getUserByGithubId', () => {
        it('returns user by github id', async () => {
            const mockUser = { id: '1', github_id: 12345, username: 'githubuser' };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserByGithubId(12345);

            expect(result).toEqual(mockUser);
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns null if github user not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUserByGithubId(99999);

            expect(result).toBeNull();
        });
    });

    describe('getUserCountByUsername', () => {
        it('returns count of users with username', async () => {
            mockWhere.mockResolvedValue([{ count: 1 }]);

            const result = await userService.getUserCountByUsername('existinguser');

            expect(result).toBe(1);
            expect(mockSelect).toHaveBeenCalled();
        });

        it('returns 0 if username does not exist', async () => {
            mockWhere.mockResolvedValue([{ count: 0 }]);

            const result = await userService.getUserCountByUsername('newuser');

            expect(result).toBe(0);
        });
    });

    describe('getUserCountByEmail', () => {
        it('returns count of users with email', async () => {
            mockWhere.mockResolvedValue([{ count: 1 }]);

            const result = await userService.getUserCountByEmail('existing@example.com');

            expect(result).toBe(1);
        });

        it('returns 0 if email does not exist', async () => {
            mockWhere.mockResolvedValue([{ count: 0 }]);

            const result = await userService.getUserCountByEmail('new@example.com');

            expect(result).toBe(0);
        });
    });

    describe('createUser', () => {
        it('creates a new user and profile', async () => {
            const signupData = {
                email: 'new@example.com',
                password: 'hashedpassword',
                username: 'newuser',
                first_name: 'New',
                last_name: 'User'
            };

            mockReturning.mockResolvedValue([{ 
                id: 'new-id', 
                email: signupData.email, 
                username: signupData.username 
            }]);

            const result = await userService.createUser(signupData);

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('email', signupData.email);
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe('getUserWithPassword', () => {
        it('returns user with password field', async () => {
            const mockUser = { 
                id: '1', 
                username: 'user1', 
                password: 'hashedpassword' 
            };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserWithPassword('1');

            expect(result).toHaveProperty('password');
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns null if user not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUserWithPassword('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('getUserProfile', () => {
        it('returns user with profile', async () => {
            const mockUser = { 
                id: '1', 
                username: 'user1',
                profiles: { bio: 'My bio', website: 'https://test.com' }
            };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserProfile('1');

            expect(result).toHaveProperty('profiles');
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns null if user not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUserProfile('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('getUserByEmailRaw', () => {
        it('returns user by email', async () => {
            const mockUser = { id: '1', email: 'test@example.com', password: 'hash' };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserByEmailRaw('test@example.com');

            expect(result).toEqual(mockUser);
        });

        it('returns null if email not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUserByEmailRaw('notfound@example.com');

            expect(result).toBeNull();
        });
    });

    describe('getUserByUsernameRaw', () => {
        it('returns user by username', async () => {
            const mockUser = { id: '1', username: 'testuser', password: 'hash' };
            mockFindFirst.mockResolvedValue(mockUser);

            const result = await userService.getUserByUsernameRaw('testuser');

            expect(result).toEqual(mockUser);
        });

        it('returns null if username not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.getUserByUsernameRaw('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('updatePassword', () => {
        it('updates user password', async () => {
            mockReturning.mockResolvedValue([{ id: '1' }]);

            const result = await userService.updatePassword('1', 'newhash');

            expect(result).toHaveProperty('id', '1');
            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    describe('followUser', () => {
        it('creates a follow relationship', async () => {
            const follower = { id: 'user1', username: 'follower' };
            const following = { id: 'user2', username: 'following' };
            
            mockFindFirst.mockResolvedValueOnce(follower); // follower exists
            mockFindFirst.mockResolvedValueOnce(following); // following exists
            mockFindFirst.mockResolvedValueOnce(null); // no existing follow
            mockReturning.mockResolvedValue([{
                id: 'follow-id',
                follower_id: 'user1',
                following_id: 'user2'
            }]);

            const result = await userService.followUser('user1', 'user2');

            expect(result).toHaveProperty('follower_id', 'user1');
            expect(result).toHaveProperty('following_id', 'user2');
            expect(mockInsert).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('throws error if follower does not exist', async () => {
            mockFindFirst.mockResolvedValue(null);

            expect(userService.followUser('non-existent', 'user2')).rejects.toThrow();
        });

        it('throws error if already following', async () => {
            const follower = { id: 'user1', username: 'follower' };
            const following = { id: 'user2', username: 'following' };
            const existingFollow = { id: 'follow-id', follower_id: 'user1', following_id: 'user2' };
            
            mockFindFirst.mockResolvedValueOnce(follower);
            mockFindFirst.mockResolvedValueOnce(following);
            mockFindFirst.mockResolvedValueOnce(existingFollow);

            expect(userService.followUser('user1', 'user2')).rejects.toThrow();
        });
    });

    describe('unfollowUser', () => {
        it('soft deletes a follow relationship', async () => {
            const existingFollow = {
                id: 'follow-id',
                follower_id: 'user1',
                following_id: 'user2'
            };
            
            mockFindFirst.mockResolvedValue(existingFollow);
            mockReturning.mockResolvedValue([{
                ...existingFollow,
                deleted_at: new Date().toISOString()
            }]);

            const result = await userService.unfollowUser('user1', 'user2');

            expect(result).toHaveProperty('deleted_at');
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('throws error if follow relationship does not exist', async () => {
            mockFindFirst.mockResolvedValue(null);

            expect(userService.unfollowUser('user1', 'user2')).rejects.toThrow();
        });
    });

    describe('getFollowers', () => {
        it('returns paginated list of followers', async () => {
            const mockFollowers = [
                { id: 'user1', username: 'follower1', created_at: new Date().toISOString() },
                { id: 'user2', username: 'follower2', created_at: new Date().toISOString() }
            ];
            const mockCount = [{ count: 2 }];

            // Mock the select chain
            const mockLimit = mock(() => ({ offset: mock(() => Promise.resolve(mockFollowers)) }));
            const mockOrderBy = mock(() => ({ limit: mockLimit }));
            const mockWhere = mock(() => ({ orderBy: mockOrderBy }));
            const mockInnerJoin = mock(() => ({ where: mockWhere }));
            const mockFrom = mock(() => ({ innerJoin: mockInnerJoin }));
            mockSelect.mockReturnValue({ from: mockFrom });

            // Mock count query
            const mockCountWhere = mock(() => Promise.resolve(mockCount));
            const mockCountInnerJoin = mock(() => ({ where: mockCountWhere }));
            const mockCountFrom = mock(() => ({ innerJoin: mockCountInnerJoin }));
            mockSelect.mockReturnValueOnce({ from: mockFrom });
            mockSelect.mockReturnValueOnce({ from: mockCountFrom });

            const result = await userService.getFollowers('user-id', { limit: 10, offset: 0 });

            expect(result.data).toBeDefined();
            expect(result.meta).toBeDefined();
            expect(mockSelect).toHaveBeenCalled();
        });
    });

    describe('getFollowing', () => {
        it('returns paginated list of following users', async () => {
            const mockFollowing = [
                { id: 'user1', username: 'following1', created_at: new Date().toISOString() },
                { id: 'user2', username: 'following2', created_at: new Date().toISOString() }
            ];
            const mockCount = [{ count: 2 }];

            // Mock the select chain
            const mockLimit = mock(() => ({ offset: mock(() => Promise.resolve(mockFollowing)) }));
            const mockOrderBy = mock(() => ({ limit: mockLimit }));
            const mockWhere = mock(() => ({ orderBy: mockOrderBy }));
            const mockInnerJoin = mock(() => ({ where: mockWhere }));
            const mockFrom = mock(() => ({ innerJoin: mockInnerJoin }));
            mockSelect.mockReturnValue({ from: mockFrom });

            // Mock count query
            const mockCountWhere = mock(() => Promise.resolve(mockCount));
            const mockCountInnerJoin = mock(() => ({ where: mockCountWhere }));
            const mockCountFrom = mock(() => ({ innerJoin: mockCountInnerJoin }));
            mockSelect.mockReturnValueOnce({ from: mockFrom });
            mockSelect.mockReturnValueOnce({ from: mockCountFrom });

            const result = await userService.getFollowing('user-id', { limit: 10, offset: 0 });

            expect(result.data).toBeDefined();
            expect(result.meta).toBeDefined();
            expect(mockSelect).toHaveBeenCalled();
        });
    });

    describe('isFollowing', () => {
        it('returns true if following', async () => {
            const existingFollow = {
                id: 'follow-id',
                follower_id: 'user1',
                following_id: 'user2'
            };
            mockFindFirst.mockResolvedValue(existingFollow);

            const result = await userService.isFollowing('user1', 'user2');

            expect(result).toBe(true);
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns false if not following', async () => {
            mockFindFirst.mockResolvedValue(null);

            const result = await userService.isFollowing('user1', 'user2');

            expect(result).toBe(false);
        });
    });

    describe('updateProfile', () => {
        beforeEach(() => {
            mockFindFirst.mockClear();
            mockUpdate.mockClear();
            mockReturning.mockClear();
            mockSet.mockClear();
        });

        it('should update user profile successfully', async () => {
            const userId = 'user-123';
            const updateData = {
                bio: 'Updated bio',
                phone: '+1234567890',
                location: 'New York'
            };

            const mockUser = { id: userId, email: 'test@example.com' };
            const mockUpdatedProfile = { id: 1, user_id: userId, ...updateData };

            mockFindFirst.mockResolvedValue(mockUser);
            mockReturning.mockResolvedValue([mockUpdatedProfile]);

            const result = await userService.updateProfile(userId, updateData);

            expect(result).toEqual(mockUpdatedProfile);
            expect(mockFindFirst).toHaveBeenCalledWith({
                where: expect.anything(),
                columns: { password: false }
            });
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ ...updateData, updated_at: expect.any(String) }));
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should throw NotFound error when user does not exist', async () => {
            const userId = 'nonexistent-user';
            const updateData = { bio: 'Updated bio' };

            mockFindFirst.mockResolvedValue(null);

            await expect(userService.updateProfile(userId, updateData))
                .rejects.toThrow('User');
        });

        it('should handle database errors gracefully', async () => {
            const userId = 'user-123';
            const updateData = { bio: 'Updated bio' };

            const mockUser = { id: userId, email: 'test@example.com' };
            mockFindFirst.mockResolvedValue(mockUser);
            mockUpdate.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            await expect(userService.updateProfile(userId, updateData))
                .rejects.toThrow('Database operation failed');
        });

        it('should handle partial updates', async () => {
            const userId = 'user-123';
            const updateData = { bio: 'Just bio update' };

            const mockUser = { id: userId, email: 'test@example.com' };
            const mockUpdatedProfile = { 
                id: 1, 
                user_id: userId, 
                bio: 'Just bio update',
                created_at: null,
                updated_at: null,
                website: null,
                phone: null,
                location: null
            };

            mockFindFirst.mockResolvedValue(mockUser);
            mockReturning.mockResolvedValue([mockUpdatedProfile]);

            const result = await userService.updateProfile(userId, updateData);

            expect(result).toEqual(mockUpdatedProfile);
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ ...updateData, updated_at: expect.any(String) }));
        });
    });
});
