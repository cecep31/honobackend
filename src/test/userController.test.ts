import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { errorHandler } from '../middlewares/errorHandler';

mock.module('../middlewares/auth', () => ({
  auth: async (c: any, next: any) => {
    c.set('user', {
      user_id: UUID1,
      email: 'test@example.com',
      is_super_admin: true,
    });
    await next();
  },
}));

const UUID1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';

const userService = {
  getUsers: mock(async () => ({
    data: [{ id: UUID1, username: 'alice' }],
    meta: { total_items: 1, limit: 10, offset: 0 },
  })),
  getUserMe: mock(async (id: string, profile: boolean) => ({
    id,
    username: 'testuser',
    ...(profile ? { profiles: { bio: 'Hello' } } : {}),
  })),
  updateProfile: mock(async () => ({ user_id: UUID1, bio: 'Updated' })),
  updateUser: mock(async () => ({ id: UUID1 })),
  updateUserImage: mock(async () => ({ id: UUID1, image: 'new.jpg' })),
  getUserByUsername: mock(async (username: string) => ({
    id: UUID1,
    username,
    first_name: 'Test',
  })),
  getUser: mock(async (id: string) => ({ id, username: 'user' })),
  addUser: mock(async () => ({ id: UUID1, username: 'newuser' })),
  deleteUser: mock(async () => ({ id: UUID1 })),
  followUser: mock(async () => ({ follower_id: UUID1, following_id: UUID2 })),
  unfollowUser: mock(async () => ({ follower_id: UUID1, following_id: UUID2, deleted_at: new Date().toISOString() })),
  getFollowers: mock(async () => ({
    data: [{ id: UUID1, username: 'follower1' }],
    meta: { total_items: 1 },
  })),
  getFollowing: mock(async () => ({
    data: [{ id: UUID2, username: 'following1' }],
    meta: { total_items: 1 },
  })),
  isFollowing: mock(async () => true),
  isUserSuperAdmin: mock(async () => true),
  getUserByEmailRaw: mock(async () => null),
  getUserByUsernameRaw: mock(async () => null),
};

const { createUserController } = await import('../modules/users/controllers/userController');

describe('UserController', () => {
  const app = new Hono();
  app.onError(errorHandler());
  app.route('/users', createUserController(userService as any));
  const client = testClient(app);

  beforeEach(() => {
    Object.values(userService).forEach((m: any) => m?.mockClear?.());
  });

  it('GET /users returns user list for super admin', async () => {
    const res = await client.users.$get(
      { query: { limit: '10', offset: '0' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('GET /users/me returns current user', async () => {
    const res = await client.users.me.$get(
      { query: {} },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.username).toBe('testuser');
  });

  it('GET /users/me?profile=true returns user with profile', async () => {
    const res = await client.users.me.$get(
      { query: { profile: 'true' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.profiles).toBeDefined();
  });

  it('PATCH /users/me updates user', async () => {
    const res = await client.users.me.$patch(
      { json: { first_name: 'Updated' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(userService.updateUser).toHaveBeenCalledWith(UUID1, { first_name: 'Updated' });
  });

  it('PATCH /users/me/profile updates profile', async () => {
    const res = await client.users.me.profile.$patch(
      { json: { bio: 'Updated bio' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(userService.updateProfile).toHaveBeenCalledWith(UUID1, { bio: 'Updated bio' });
  });

  it('GET /users/username/:username returns user', async () => {
    const res = await client.users['username'][':username'].$get(
      { param: { username: 'alice' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.username).toBe('alice');
  });

  it('GET /users/:id returns user for super admin', async () => {
    const res = await client.users[':id'].$get(
      { param: { id: UUID1 } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(UUID1);
  });

  it('POST /users creates user for super admin', async () => {
    const res = await client.users.$post(
      {
        json: {
          first_name: 'New',
          last_name: 'User',
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
        },
      },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.username).toBe('newuser');
  });

  it('PATCH /users/:id updates user for super admin', async () => {
    const res = await client.users[':id'].$patch(
      { param: { id: UUID1 }, json: { first_name: 'Updated' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('DELETE /users/:id deletes user for super admin', async () => {
    const res = await client.users[':id'].$delete(
      { param: { id: UUID1 } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('POST /users/:id/follow creates follow', async () => {
    const res = await client.users[':id'].follow.$post(
      { param: { id: UUID2 } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(userService.followUser).toHaveBeenCalledWith(UUID1, UUID2);
  });

  it('POST /users/:id/follow rejects self-follow', async () => {
    const res = await client.users[':id'].follow.$post(
      { param: { id: UUID1 } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('DELETE /users/:id/follow removes follow', async () => {
    const res = await client.users[':id'].follow.$delete(
      { param: { id: UUID2 } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('GET /users/:id/followers returns followers', async () => {
    const res = await client.users[':id'].followers.$get(
      { param: { id: UUID2 }, query: { limit: '10', offset: '0' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('GET /users/:id/following returns following', async () => {
    const res = await client.users[':id'].following.$get(
      { param: { id: UUID2 }, query: { limit: '10', offset: '0' } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('GET /users/:id/is-following returns status', async () => {
    const res = await client.users[':id']['is-following'].$get(
      { param: { id: UUID2 } },
      { headers: { Authorization: 'Bearer test' } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isFollowing).toBe(true);
  });
});
