import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NotificationService } from '../modules/notifications/services/notificationService';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockNotificationsFindMany = mock();

mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
    select: mocks.mockSelect,
    query: {
      notifications: {
        findMany: mockNotificationsFindMany,
      },
    },
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    mocks.reset();
    mockNotificationsFindMany.mockReset();
  });

  it('creates notifications with serialized data', async () => {
    mocks.mockReturning.mockResolvedValue([
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'user_followed',
        title: 'New follower',
        message: 'alice started following you.',
        data: '{"actor_user_id":"user-2"}',
        read: false,
      },
    ]);

    const result = await notificationService.createNotification({
      user_id: 'user-1',
      type: 'user_followed',
      title: 'New follower',
      message: 'alice started following you.',
      data: { actor_user_id: 'user-2' },
    });

    expect(result.data).toEqual({ actor_user_id: 'user-2' });
    expect(mocks.mockInsert).toHaveBeenCalled();
  });

  it('returns paginated notifications with parsed payloads', async () => {
    mockNotificationsFindMany.mockResolvedValue([
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'post_comment',
        title: 'New comment on your post',
        message: 'alice commented on your post.',
        data: '{"post_id":"post-1"}',
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    mocks.mockFrom.mockReturnValue({
      where: mock(() => Promise.resolve([{ count: 1 }])),
    });

    const result = await notificationService.getNotifications('user-1', {
      offset: 0,
      limit: 20,
      unread: true,
    });

    expect(result.meta.total_items).toBe(1);
    expect(result.data[0]?.data).toEqual({ post_id: 'post-1' });
  });

  it('marks all unread notifications as read', async () => {
    mocks.mockReturning.mockResolvedValue([{ id: 'notif-1' }, { id: 'notif-2' }]);

    const result = await notificationService.markAllAsRead('user-1');

    expect(result).toEqual({ updated_count: 2 });
    expect(mocks.mockUpdate).toHaveBeenCalled();
  });

  it('marks a single notification as read', async () => {
    mocks.mockReturning.mockResolvedValue([
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'post_comment',
        title: 'New comment',
        read: true,
        data: null,
      },
    ]);

    const result = await notificationService.markAsRead('notif-1', 'user-1');

    expect(result.id).toBe('notif-1');
    expect(result.read).toBe(true);
    expect(result.data).toBeNull();
    expect(mocks.mockUpdate).toHaveBeenCalled();
  });

  it('throws NotFound when marking non-existent notification as read', async () => {
    mocks.mockReturning.mockResolvedValue([]);

    await expect(notificationService.markAsRead('notif-999', 'user-1')).rejects.toThrow('Notification not found');
  });

  it('returns unread count', async () => {
    mocks.mockFrom.mockReturnValue({
      where: mock(() => Promise.resolve([{ count: 5 }])),
    });

    const result = await notificationService.getUnreadCount('user-1');

    expect(result.unread_count).toBe(5);
  });

  it('returns zero unread count when no unread notifications', async () => {
    mocks.mockFrom.mockReturnValue({
      where: mock(() => Promise.resolve([{ count: 0 }])),
    });

    const result = await notificationService.getUnreadCount('user-1');

    expect(result.unread_count).toBe(0);
  });

  it('handles notifications without data field', async () => {
    mocks.mockReturning.mockResolvedValue([
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'system',
        title: 'System update',
        message: null,
        data: null,
        read: false,
      },
    ]);

    const result = await notificationService.createNotification({
      user_id: 'user-1',
      type: 'system',
      title: 'System update',
    });

    expect(result.data).toBeNull();
  });

  it('handles invalid JSON in data gracefully', async () => {
    mockNotificationsFindMany.mockResolvedValue([
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'post_comment',
        title: 'New comment',
        data: 'not-json',
        read: false,
      },
    ]);
    mocks.mockFrom.mockReturnValue({
      where: mock(() => Promise.resolve([{ count: 1 }])),
    });

    const result = await notificationService.getNotifications('user-1');

    expect(result.data[0].data).toBe('not-json');
  });

  it('returns notifications without unread filter', async () => {
    mockNotificationsFindMany.mockResolvedValue([
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'post_comment',
        title: 'New comment',
        data: null,
        read: false,
      },
    ]);
    mocks.mockFrom.mockReturnValue({
      where: mock(() => Promise.resolve([{ count: 1 }])),
    });

    const result = await notificationService.getNotifications('user-1', { offset: 0, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total_items).toBe(1);
  });
});
