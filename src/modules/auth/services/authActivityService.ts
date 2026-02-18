import { db } from "../../../database/drizzle";
import { auth_activity_logs } from "../../../database/schemas/postgre/schema";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export type ActivityType =
  | "login"
  | "login_failed"
  | "logout"
  | "register"
  | "password_change"
  | "password_reset_request"
  | "password_reset"
  | "token_refresh"
  | "oauth_login"
  | "oauth_login_failed";

export type ActivityStatus = "success" | "failure" | "pending";

export interface LogActivityParams {
  userId?: string;
  activityType: ActivityType;
  ipAddress?: string;
  userAgent?: string;
  status: ActivityStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface GetActivityLogsParams {
  userId?: string;
  activityType?: ActivityType;
  status?: ActivityStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuthActivityService {
  /**
   * Log an authentication activity
   */
  async logActivity(params: LogActivityParams) {
    try {
      const activityLog = await db
        .insert(auth_activity_logs)
        .values({
          id: randomUUIDv7(),
          user_id: params.userId || null,
          activity_type: params.activityType,
          ip_address: params.ipAddress || null,
          user_agent: params.userAgent || null,
          status: params.status,
          error_message: params.errorMessage || null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        })
        .returning();

      return activityLog[0];
    } catch (error) {
      // Log error but don't throw - activity logging should not break auth flow
      console.error("Failed to log auth activity:", error);
      return null;
    }
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(params: GetActivityLogsParams = {}) {
    const {
      userId,
      activityType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = params;

    const conditions = [];

    if (userId) {
      conditions.push(eq(auth_activity_logs.user_id, userId));
    }

    if (activityType) {
      conditions.push(eq(auth_activity_logs.activity_type, activityType));
    }

    if (status) {
      conditions.push(eq(auth_activity_logs.status, status));
    }

    if (startDate) {
      conditions.push(
        gte(auth_activity_logs.created_at, startDate.toISOString()),
      );
    }

    if (endDate) {
      conditions.push(lte(auth_activity_logs.created_at, endDate.toISOString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db.query.auth_activity_logs.findMany({
      where: whereClause,
      orderBy: [desc(auth_activity_logs.created_at)],
      limit,
      offset,
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    // Parse metadata JSON strings
    return logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  }

  /**
   * Get activity logs count
   */
  async getActivityLogsCount(params: GetActivityLogsParams = {}) {
    const { userId, activityType, status, startDate, endDate } = params;

    const conditions = [];

    if (userId) {
      conditions.push(eq(auth_activity_logs.user_id, userId));
    }

    if (activityType) {
      conditions.push(eq(auth_activity_logs.activity_type, activityType));
    }

    if (status) {
      conditions.push(eq(auth_activity_logs.status, status));
    }

    if (startDate) {
      conditions.push(
        gte(auth_activity_logs.created_at, startDate.toISOString()),
      );
    }

    if (endDate) {
      conditions.push(lte(auth_activity_logs.created_at, endDate.toISOString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await db
      .select({ count: count() })
      .from(auth_activity_logs)
      .where(whereClause);

    return result.count;
  }

  /**
   * Get recent activity for a user
   */
  async getUserRecentActivity(userId: string, limit: number = 10) {
    return this.getActivityLogs({ userId, limit });
  }

  /**
   * Get failed login attempts for a user
   */
  async getFailedLoginAttempts(
    userId: string,
    since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  ) {
    return this.getActivityLogs({
      userId,
      activityType: "login_failed",
      startDate: since,
    });
  }

  /**
   * Clean up old activity logs (can be run as a cron job)
   */
  async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(auth_activity_logs)
      .where(lte(auth_activity_logs.created_at, cutoffDate.toISOString()))
      .returning({ id: auth_activity_logs.id });

    return result.length;
  }
}
