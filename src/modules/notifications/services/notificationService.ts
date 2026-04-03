import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { notifications } from '../../../database/schemas/postgres/schema';
import { Errors } from '../../../utils/error';
import { getPaginationMetadata } from '../../../utils/paginate';

export interface NotificationPayload {
  [key: string]: unknown;
}

export interface CreateNotificationInput {
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  data?: NotificationPayload | null;
}

export interface NotificationListParams {
  offset: number;
  limit: number;
  unread?: boolean;
}

export class NotificationService {
  private parseData(data: string | null) {
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private mapNotification<T extends { data: string | null }>(notification: T) {
    return {
      ...notification,
      data: this.parseData(notification.data),
    };
  }

  async createNotification(input: CreateNotificationInput) {
    const now = new Date().toISOString();
    const [notification] = await db
      .insert(notifications)
      .values({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        data: input.data ? JSON.stringify(input.data) : null,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return this.mapNotification(notification);
  }

  async getNotifications(
    userId: string,
    params: NotificationListParams = { offset: 0, limit: 20 }
  ) {
    const whereClause = and(
      eq(notifications.user_id, userId),
      params.unread ? eq(notifications.read, false) : undefined
    );

    const [items, totalRows] = await Promise.all([
      db.query.notifications.findMany({
        where: whereClause,
        orderBy: [desc(notifications.created_at)],
        limit: params.limit,
        offset: params.offset,
      }),
      db
        .select({ count: count() })
        .from(notifications)
        .where(whereClause),
    ]);

    return {
      data: items.map((notification) => this.mapNotification(notification)),
      meta: getPaginationMetadata(totalRows[0]?.count ?? 0, params.offset, params.limit),
    };
  }

  async getUnreadCount(userId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)));

    return { unread_count: result?.count ?? 0 };
  }

  async markAsRead(notificationId: string, userId: string) {
    const [notification] = await db
      .update(notifications)
      .set({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .where(and(eq(notifications.id, notificationId), eq(notifications.user_id, userId)))
      .returning();

    if (!notification) {
      throw Errors.NotFound('Notification');
    }

    return this.mapNotification(notification);
  }

  async markAllAsRead(userId: string) {
    const updated = await db
      .update(notifications)
      .set({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)))
      .returning({ id: notifications.id });

    return { updated_count: updated.length };
  }
}
