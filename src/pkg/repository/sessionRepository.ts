import { eq } from "drizzle-orm";
import { db } from "../../database/drizzel";
import { sessions as sessionModel } from "../../database/schemas/postgre/schema";

interface SessionCreate {
  user_id: string;
  refresh_token: string;
  expires_at: string;
  user_agent: string;
}

export class SessionRepository {
  async insertSession(data: SessionCreate) {
    const session = await db.insert(sessionModel).values({
      userId: data.user_id,
      expiresAt: data.expires_at,
      userAgent: data.user_agent,
      token: data.refresh_token,
    }).returning({
      refresh_token: sessionModel.token,
    });
    return session[0];
  }

  async getSessionByRefreshToken(refresh_token: string) {
    const session = await db
      .select()
      .from(sessionModel)
      .where(eq(sessionModel.token, refresh_token));
    return session[0];
  }

  async deleteSessionByRefreshToken(refresh_token: string) {
    await db.delete(sessionModel).where(eq(sessionModel.token, refresh_token));
  }

  async getSessionByUserId(user_id: string) {
    return await db
      .select()
      .from(sessionModel)
      .where(eq(sessionModel.userId, user_id));
  }
}
