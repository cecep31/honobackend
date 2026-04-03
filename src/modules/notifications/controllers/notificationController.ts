import { Hono } from 'hono';
import { auth } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validateRequest';
import type { AppServices } from '../../../services';
import type { Variables } from '../../../types/context';
import { sendSuccess } from '../../../utils/response';
import { listNotificationsQuerySchema, notificationIdSchema } from '../validation';

type NotificationService = AppServices['notificationService'];

export const createNotificationController = (notificationService: NotificationService) =>
  new Hono<{ Variables: Variables }>()
    .get('/', auth, validateRequest('query', listNotificationsQuerySchema), async (c) => {
      const authUser = c.get('user');
      const q = c.req.valid('query');
      const { data, meta } = await notificationService.getNotifications(authUser.user_id, {
        offset: q.offset,
        limit: q.limit,
        unread: q.unread,
      });

      return sendSuccess(c, data, 'Notifications fetched successfully', 200, meta);
    })
    .get('/unread-count', auth, async (c) => {
      const authUser = c.get('user');
      const count = await notificationService.getUnreadCount(authUser.user_id);
      return sendSuccess(c, count, 'Unread notification count fetched successfully');
    })
    .patch('/:id/read', auth, validateRequest('param', notificationIdSchema), async (c) => {
      const authUser = c.get('user');
      const { id } = c.req.valid('param');
      const notification = await notificationService.markAsRead(id, authUser.user_id);
      return sendSuccess(c, notification, 'Notification marked as read successfully');
    })
    .patch('/read-all', auth, async (c) => {
      const authUser = c.get('user');
      const result = await notificationService.markAllAsRead(authUser.user_id);
      return sendSuccess(c, result, 'All notifications marked as read successfully');
    });
