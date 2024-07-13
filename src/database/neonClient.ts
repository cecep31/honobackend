import * as schema from "./schema/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema: schema,
  logger: process.env.SQL_LOG ? true : undefined,
});
