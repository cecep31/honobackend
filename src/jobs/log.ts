import { randomUUIDv7 } from "bun";
import { tursodb } from "../database/drizzel";
import { activity } from "../database/schemas/turso/schema";
export async function writeLog(user_id: string = "", data: string = "") {
  return await tursodb.insert(activity).values({
    activity_id: randomUUIDv7().toString(),
    user_id: user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activity_type: "log",
    data,
  }).returning();
}
