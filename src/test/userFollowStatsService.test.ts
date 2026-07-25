import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockWhereSelect = mock();
const mockInnerJoin = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect, innerJoin: mockInnerJoin }));
const mockUserFindFirst = mock();

mock.module('../database/drizzle', () => ({
  db: {
    select: mocks.mockSelect,
    update: mocks.mockUpdate,
    query: {
      users: { findFirst: mockUserFindFirst },
    },
  },
}));

const { UserFollowService } = await import('../modules/users/services/userFollowService');
const { UserService } = await import('../modules/users/services/userService');

describe('UserFollowService stats & mutuals', () => {
  let followService: InstanceType<typeof UserFollowService>;

  beforeEach(() => {
    followService = new UserFollowService();
    mocks.reset();
    mockWhereSelect.mockReset();
    mockInnerJoin.mockReset();
    mockFrom.mockClear();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

  describe('getFollowStats', () => {
    it('returns follower and following counts', async () => {
      mockWhereSelect
        .mockResolvedValueOnce([{ count: 12 }]) // followers
        .mockResolvedValueOnce([{ count: 5 }]); // following

      const stats = await followService.getFollowStats('user-1');

      expect(stats).toEqual({
        user_id: 'user-1',
        followers_count: 12,
        following_count: 5,
      });
    });

    it('returns zeros when counts are missing', async () => {
      mockWhereSelect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const stats = await followService.getFollowStats('user-1');

      expect(stats.followers_count).toBe(0);
      expect(stats.following_count).toBe(0);
    });
  });

  describe('getMutualFollows', () => {
    it('returns users followed by both users', async () => {
      const mutuals = [
        { id: 'user-3', username: 'shared', first_name: 'Shared', last_name: null },
      ];
      mockInnerJoin
        .mockReturnValueOnce({ innerJoin: mockInnerJoin })
        .mockReturnValueOnce({ where: mockWhereSelect });
      mockWhereSelect.mockResolvedValue(mutuals);

      const result = await followService.getMutualFollows('user-1', 'user-2');

      expect(result).toEqual(mutuals);
      expect(mockInnerJoin).toHaveBeenCalledTimes(2);
    });
  });
});

describe('UserService.restoreUser', () => {
  let userService: InstanceType<typeof UserService>;

  const deletedUser = {
    id: 'user-1',
    email: 'deleted@example.com',
    username: 'deleted',
    password: 'hashed',
    deleted_at: '2026-07-01T00:00:00.000Z',
  };

  beforeEach(() => {
    userService = new UserService();
    mocks.reset();
    mockUserFindFirst.mockReset();
  });

  it('restores a soft-deleted user without password leakage', async () => {
    mockUserFindFirst
      .mockResolvedValueOnce(deletedUser) // the deleted user
      .mockResolvedValueOnce(undefined); // no conflict
    mocks.mockReturning.mockResolvedValue([{ ...deletedUser, deleted_at: null }]);

    const result = await userService.restoreUser('user-1');

    expect(result.deleted_at).toBeNull();
    expect((result as any).password).toBeUndefined();
    expect(mocks.mockUpdate).toHaveBeenCalled();
  });

  it('throws NotFound when the user does not exist', async () => {
    mockUserFindFirst.mockResolvedValueOnce(undefined);

    await expect(userService.restoreUser('missing')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mocks.mockUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFound when the user is not deleted', async () => {
    mockUserFindFirst.mockResolvedValueOnce({ ...deletedUser, deleted_at: null });

    await expect(userService.restoreUser('user-1')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mocks.mockUpdate).not.toHaveBeenCalled();
  });

  it('throws a conflict when email/username is taken by an active user', async () => {
    mockUserFindFirst
      .mockResolvedValueOnce(deletedUser)
      .mockResolvedValueOnce({ id: 'other-user' });

    await expect(userService.restoreUser('user-1')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.mockUpdate).not.toHaveBeenCalled();
  });
});
