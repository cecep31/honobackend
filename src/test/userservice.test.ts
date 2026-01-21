import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock the database before importing services
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock((model: any) => ({ values: mockValues }));
const mockWhere = mock(() => ({ returning: mockReturning }));
const mockSet = mock(() => ({ where: mockWhere }));
const mockUpdate = mock(() => ({ set: mockSet }));
const mockUserFindFirst = mock();
const mockUserFindMany = mock();
const mockCountResult = mock();
const mockFrom = mock(() => ({ where: mockCountResult }));
const mockSelect = mock(() => ({ from: mockFrom }));
const mockUserFollowsFindFirst = mock();

// Ensure mockValues always returns the correct structure
mockValues.mockImplementation(() => ({ returning: mockReturning }));

// Create mock functions for complex query chains
const createMockSelectChain = (result: any) => {
  const mockOffset = mock(() => Promise.resolve(result));
  const mockLimit = mock(() => ({ offset: mockOffset }));
  const mockOrderBy = mock(() => ({ limit: mockLimit }));
  const mockWhereClause = mock(() => ({ orderBy: mockOrderBy }));
  const mockInnerJoin = mock(() => ({ where: mockWhereClause }));
  const mockFromFollows = mock(() => ({ innerJoin: mockInnerJoin }));
  return { mockFromFollows, mockCountResult };
};

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
      query: {
        users: {
          findFirst: mockUserFindFirst,
          findMany: mockUserFindMany,
        },
        user_follows: {
          findFirst: mockUserFollowsFindFirst,
        },
      },
    },
  };
});

// Mock S3 helper - must be before service import
const mockUploadFile = mock();
const mockDeleteFile = mock();
mock.module('../utils/s3', () => ({
  getS3Helper: mock(() => ({
    uploadFile: mockUploadFile,
    deleteFile: mockDeleteFile,
  })),
}));

// Import after mocks
import { UserService } from '../modules/users/services/userService';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    mockReturning.mockReset();
    mockValues.mockReset();
    mockValues.mockImplementation(() => ({ returning: mockReturning }));
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockSet.mockClear();
    mockWhere.mockClear();
    mockUserFindFirst.mockReset();
    mockUserFindMany.mockReset();
    mockCountResult.mockReset();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockUserFollowsFindFirst.mockReset();
    mockUploadFile.mockReset();
    mockDeleteFile.mockReset();
  });

  describe('getUsers', () => {
    it('returns paginated list of users without passwords', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          username: 'user1',
          first_name: 'John',
          last_name: 'Doe',
        },
        {
          id: 'user2',
          email: 'user2@example.com',
          username: 'user2',
          first_name: 'Jane',
          last_name: 'Smith',
        },
      ];

      mockUserFindMany.mockResolvedValue(mockUsers);
      mockCountResult.mockResolvedValue([{ count: 2 }]);

      const result = await userService.getUsers({ offset: 0, limit: 10 });

      expect(result.data).toEqual(mockUsers);
      expect(result.meta).toHaveProperty('total_items');
      expect(result.meta.total_items).toBe(2);
      expect(mockUserFindMany).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      mockUserFindMany.mockRejectedValue(new Error('Database error'));

      await expect(userService.getUsers()).rejects.toThrow();
    });
  });

  describe('getUser', () => {
    it('returns user by ID without password', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUser('user1');

      expect(result).toEqual(mockUser);
      expect(mockUserFindFirst).toHaveBeenCalled();
    });

    it('returns null when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      const result = await userService.getUser('nonexistent');

      expect(result).toBeNull();
    });

    it('handles database errors', async () => {
      mockUserFindFirst.mockRejectedValue(new Error('Database error'));

      await expect(userService.getUser('user1')).rejects.toThrow();
    });
  });

  describe('getUserMe', () => {
    it('returns user without profile when profile flag is false', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserMe('user1', false);

      expect(result).toEqual(mockUser);
      expect(mockUserFindFirst).toHaveBeenCalled();
    });

    it('returns user with profile when profile flag is true', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        profiles: {
          bio: 'Test bio',
          phone: '123-456-7890',
        },
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserMe('user1', true);

      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('profiles');
    });
  });

  describe('deleteUser', () => {
    it('soft deletes a user', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);
      mockReturning.mockResolvedValue([{ id: 'user1' }]);

      const result = await userService.deleteUser('user1');

      expect(result.id).toBe('user1');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws error when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(userService.deleteUser('nonexistent')).rejects.toThrow('not found');
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
        image: '/images/default.jpg',
      };

      mockCountResult.mockResolvedValue([{ count: 0 }]);
      mockReturning.mockResolvedValueOnce([{ id: 'new-user-id' }]).mockResolvedValueOnce([]);

      const result = await userService.addUser(userData);

      expect(result.id).toBe('new-user-id');
      expect(mockInsert).toHaveBeenCalledTimes(2); // Once for user, once for profile
    });

    it('throws error when username already exists', async () => {
      const userData = {
        first_name: 'John',
        last_name: 'Doe',
        username: 'existinguser',
        email: 'john@example.com',
        password: 'password123',
      };

      mockCountResult.mockResolvedValue([{ count: 1 }]);

      await expect(userService.addUser(userData)).rejects.toThrow('already exists');
    });

    it('throws error when email already exists', async () => {
      const userData = {
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockCountResult
        .mockResolvedValueOnce([{ count: 0 }]) // Username check
        .mockResolvedValueOnce([{ count: 1 }]); // Email check

      await expect(userService.addUser(userData)).rejects.toThrow('already exists');
    });
  });

  describe('updateUser', () => {
    it('updates user information', async () => {
      const existingUser = {
        id: 'user1',
        username: 'oldusername',
        email: 'old@example.com',
      };

      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      mockUserFindFirst.mockResolvedValue(existingUser);
      mockReturning.mockResolvedValue([{ id: 'user1' }]);

      const result = await userService.updateUser('user1', updateData);

      expect(result.id).toBe('user1');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws error when updating to existing username', async () => {
      const existingUser = {
        id: 'user1',
        username: 'oldusername',
        email: 'old@example.com',
      };

      mockUserFindFirst.mockResolvedValue(existingUser);
      mockCountResult.mockResolvedValue([{ count: 1 }]);

      await expect(
        userService.updateUser('user1', { username: 'existinguser' })
      ).rejects.toThrow('already exists');
    });

    it('throws error when updating to existing email', async () => {
      const existingUser = {
        id: 'user1',
        username: 'username',
        email: 'old@example.com',
      };

      mockUserFindFirst.mockResolvedValue(existingUser);
      mockCountResult.mockResolvedValue([{ count: 1 }]);

      await expect(
        userService.updateUser('user1', { email: 'existing@example.com' })
      ).rejects.toThrow('already exists');
    });

    it('throws error when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', {})).rejects.toThrow('not found');
    });
  });

  describe('updateProfile', () => {
    it('updates user profile', async () => {
      const existingUser = {
        id: 'user1',
        username: 'testuser',
      };

      const profileData = {
        bio: 'New bio',
        phone: '123-456-7890',
        location: 'New York',
      };

      mockUserFindFirst.mockResolvedValue(existingUser);
      mockReturning.mockResolvedValue([{ user_id: 'user1', ...profileData }]);

      const result = await userService.updateProfile('user1', profileData);

      expect(result).toHaveProperty('bio');
      expect(result.bio).toBe('New bio');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws error when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(
        userService.updateProfile('nonexistent', { bio: 'New bio' })
      ).rejects.toThrow('not found');
    });
  });

  describe('getUserByGithubId', () => {
    it('returns user by GitHub ID', async () => {
      const mockUser = {
        id: 'user1',
        github_id: 12345,
        email: 'github@example.com',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserByGithubId(12345);

      expect(result).toEqual(mockUser);
      expect(mockUserFindFirst).toHaveBeenCalled();
    });
  });

  describe('getUserCountByUsername', () => {
    it('returns count of users with username', async () => {
      mockCountResult.mockResolvedValue([{ count: 1 }]);

      const result = await userService.getUserCountByUsername('testuser');

      expect(result).toBe(1);
    });

    it('returns 0 when username does not exist', async () => {
      mockCountResult.mockResolvedValue([{ count: 0 }]);

      const result = await userService.getUserCountByUsername('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('getUserCountByEmail', () => {
    it('returns count of users with email', async () => {
      mockCountResult.mockResolvedValue([{ count: 1 }]);

      const result = await userService.getUserCountByEmail('test@example.com');

      expect(result).toBe(1);
    });

    it('returns 0 when email does not exist', async () => {
      mockCountResult.mockResolvedValue([{ count: 0 }]);

      const result = await userService.getUserCountByEmail('nonexistent@example.com');

      expect(result).toBe(0);
    });
  });

  describe('createUser', () => {
    it('creates user from signup data', async () => {
      const signupData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'hashedpassword',
      };

      mockReturning.mockResolvedValueOnce([{ id: 'new-user-id', ...signupData }]).mockResolvedValueOnce([]);

      const result = await userService.createUser(signupData);

      expect(result.id).toBe('new-user-id');
      expect(mockInsert).toHaveBeenCalledTimes(2); // User and profile
    });
  });

  describe('getUserWithPassword', () => {
    it('returns user with password field', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedpassword',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserWithPassword('user1');

      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
    });
  });

  describe('getUserProfile', () => {
    it('returns user with profile data', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        profiles: {
          bio: 'Test bio',
        },
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile('user1');

      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('profiles');
    });
  });

  describe('getUserByEmailRaw', () => {
    it('returns user by email with password', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedpassword',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmailRaw('test@example.com');

      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
    });
  });

  describe('getUserByUsernameRaw', () => {
    it('returns user by username with password', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        password: 'hashedpassword',
      };

      mockUserFindFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserByUsernameRaw('testuser');

      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
    });
  });

  describe('updatePassword', () => {
    it('updates user password', async () => {
      mockReturning.mockResolvedValue([{ id: 'user1' }]);

      const result = await userService.updatePassword('user1', 'newhashedpassword');

      expect(result.id).toBe('user1');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('updateEmail', () => {
    it('updates user email', async () => {
      mockReturning.mockResolvedValue([{ id: 'user1' }]);

      const result = await userService.updateEmail('user1', 'newemail@example.com');

      expect(result.id).toBe('user1');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('updateUserImage', () => {
    it('uploads new image and updates user', async () => {
      const mockUser = {
        id: 'user1',
        image: null,
      };

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockUserFindFirst.mockResolvedValue(mockUser);
      mockUploadFile.mockResolvedValue(undefined);
      mockReturning.mockResolvedValue([{ id: 'user1', image: 'avatars/user1/image.jpg' }]);

      const result = await userService.updateUserImage('user1', mockFile);

      expect(result.id).toBe('user1');
      expect(mockUploadFile).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('deletes old image before uploading new one', async () => {
      const mockUser = {
        id: 'user1',
        image: 'avatars/old-image.jpg',
      };

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockUserFindFirst.mockResolvedValue(mockUser);
      mockDeleteFile.mockResolvedValue(undefined);
      mockUploadFile.mockResolvedValue(undefined);
      mockReturning.mockResolvedValue([{ id: 'user1', image: 'avatars/user1/new-image.jpg' }]);

      const result = await userService.updateUserImage('user1', mockFile);

      expect(result.id).toBe('user1');
      expect(mockDeleteFile).toHaveBeenCalled();
      expect(mockUploadFile).toHaveBeenCalled();
    });

    it('throws error when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(userService.updateUserImage('nonexistent', mockFile)).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('followUser', () => {
    it('creates follow relationship', async () => {
      const followerUser = { id: 'user1', username: 'user1' };
      const followingUser = { id: 'user2', username: 'user2' };

      mockUserFindFirst
        .mockResolvedValueOnce(followerUser)
        .mockResolvedValueOnce(followingUser);
      mockUserFollowsFindFirst.mockResolvedValue(null);
      mockReturning.mockResolvedValue([
        { id: 'follow-id', follower_id: 'user1', following_id: 'user2' },
      ]);

      const result = await userService.followUser('user1', 'user2');

      expect(result).toHaveProperty('follower_id');
      expect(result.follower_id).toBe('user1');
      expect(mockInsert).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled(); // For updating counts
    });

    it('throws error when already following', async () => {
      const followerUser = { id: 'user1', username: 'user1' };
      const followingUser = { id: 'user2', username: 'user2' };
      const existingFollow = { id: 'follow-id', follower_id: 'user1', following_id: 'user2' };

      mockUserFindFirst
        .mockResolvedValueOnce(followerUser)
        .mockResolvedValueOnce(followingUser);
      mockUserFollowsFindFirst.mockResolvedValue(existingFollow);

      await expect(userService.followUser('user1', 'user2')).rejects.toThrow(
        'Already following'
      );
    });

    it('throws error when follower user not found', async () => {
      mockUserFindFirst.mockResolvedValueOnce(null);

      await expect(userService.followUser('nonexistent', 'user2')).rejects.toThrow('not found');
    });

    it('throws error when following user not found', async () => {
      const followerUser = { id: 'user1', username: 'user1' };

      mockUserFindFirst.mockResolvedValueOnce(followerUser).mockResolvedValueOnce(null);

      await expect(userService.followUser('user1', 'nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('unfollowUser', () => {
    it('soft deletes follow relationship', async () => {
      const existingFollow = { id: 'follow-id', follower_id: 'user1', following_id: 'user2' };

      mockUserFollowsFindFirst.mockResolvedValue(existingFollow);
      mockReturning.mockResolvedValue([{ ...existingFollow, deleted_at: new Date().toISOString() }]);

      const result = await userService.unfollowUser('user1', 'user2');

      expect(result).toHaveProperty('deleted_at');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws error when follow relationship not found', async () => {
      mockUserFollowsFindFirst.mockResolvedValue(null);

      await expect(userService.unfollowUser('user1', 'user2')).rejects.toThrow('not found');
    });
  });

  describe('getFollowers', () => {
    it('returns paginated list of followers', async () => {
      const mockFollowers = [
        {
          id: 'user1',
          username: 'follower1',
          email: 'follower1@example.com',
          followers_count: 10,
          following_count: 5,
        },
      ];

      // Mock for data query (with orderBy, limit, offset)
      const mockOffset = mock(() => Promise.resolve(mockFollowers));
      const mockLimit = mock(() => ({ offset: mockOffset }));
      const mockOrderBy = mock(() => ({ limit: mockLimit }));
      const mockWhereClause = mock(() => ({ orderBy: mockOrderBy }));
      const mockInnerJoin = mock(() => ({ where: mockWhereClause }));
      const mockFromFollows = mock(() => ({ innerJoin: mockInnerJoin }));
      
      // Mock for count query (without orderBy, limit, offset)
      const mockCountWhere = mock(() => Promise.resolve([{ count: 1 }]));
      const mockCountInnerJoin = mock(() => ({ where: mockCountWhere }));
      const mockCountFrom = mock(() => ({ innerJoin: mockCountInnerJoin }));
      
      // First call returns data query chain, second call returns count query chain
      mockSelect
        .mockReturnValueOnce({ from: mockFromFollows })
        .mockReturnValueOnce({ from: mockCountFrom });

      const result = await userService.getFollowers('user1', { offset: 0, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.total_items).toBe(1);
    });
  });

  describe('getFollowing', () => {
    it('returns paginated list of following users', async () => {
      const mockFollowing = [
        {
          id: 'user2',
          username: 'following1',
          email: 'following1@example.com',
          followers_count: 15,
          following_count: 8,
        },
      ];

      // Mock for data query (with orderBy, limit, offset)
      const mockOffset = mock(() => Promise.resolve(mockFollowing));
      const mockLimit = mock(() => ({ offset: mockOffset }));
      const mockOrderBy = mock(() => ({ limit: mockLimit }));
      const mockWhereClause = mock(() => ({ orderBy: mockOrderBy }));
      const mockInnerJoin = mock(() => ({ where: mockWhereClause }));
      const mockFromFollows = mock(() => ({ innerJoin: mockInnerJoin }));
      
      // Mock for count query (without orderBy, limit, offset)
      const mockCountWhere = mock(() => Promise.resolve([{ count: 1 }]));
      const mockCountInnerJoin = mock(() => ({ where: mockCountWhere }));
      const mockCountFrom = mock(() => ({ innerJoin: mockCountInnerJoin }));
      
      // First call returns data query chain, second call returns count query chain
      mockSelect
        .mockReturnValueOnce({ from: mockFromFollows })
        .mockReturnValueOnce({ from: mockCountFrom });

      const result = await userService.getFollowing('user1', { offset: 0, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.total_items).toBe(1);
    });
  });

  describe('isFollowing', () => {
    it('returns true when user is following', async () => {
      const existingFollow = { id: 'follow-id', follower_id: 'user1', following_id: 'user2' };

      mockUserFollowsFindFirst.mockResolvedValue(existingFollow);

      const result = await userService.isFollowing('user1', 'user2');

      expect(result).toBe(true);
    });

    it('returns false when user is not following', async () => {
      mockUserFollowsFindFirst.mockResolvedValue(null);

      const result = await userService.isFollowing('user1', 'user2');

      expect(result).toBe(false);
    });
  });
});
