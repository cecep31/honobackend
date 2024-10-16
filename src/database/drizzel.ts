import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "./schema/schema";

export const db = drizzle({
  connection: {
    url: process.env["DATABASE_URL"],
    ssl: true,
  },
  logger: process.env["SQL_LOG"] ? true : undefined,
  schema: schema
});