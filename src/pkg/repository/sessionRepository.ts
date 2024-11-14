import { eq } from "drizzle-orm";
import { db } from "../../database/drizzel";
import { sessions as sessionModel } from "../../database/schemas/postgre/schema";
import { randomUUIDv7 } from "bun";

interface SessionCreate {
  user_id: string;
  refresh_token: string;
  expires_at: string;
  user_agent: string;
}

export class SessionRepository {
  async insertSession(data: SessionCreate) {
    const session = await db
      .insert(sessionModel)
      .values({ ...data, id: randomUUIDv7() })
      .returning({
        id: sessionModel.id,
        refresh_token: sessionModel.id,
      });
    return session[0];
  }

  async getSessionByRefreshToken(refresh_token: string) {
    const session = await db
      .select()
      .from(sessionModel)
      .where(eq(sessionModel.id, refresh_token));
    return session[0];
  }

  async deleteSessionByRefreshToken(refresh_token: string) {
    await db.delete(sessionModel).where(eq(sessionModel.id, refresh_token));
  }

  async getSessionByUserId(user_id: string) {
    return await db
      .select()
      .from(sessionModel)
      .where(eq(sessionModel.user_id, user_id));
  }
}
