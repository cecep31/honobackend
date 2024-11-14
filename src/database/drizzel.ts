import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schemas/postgre/schema";


export const db = drizzle({
  connection: {
    url: process.env["DATABASE_URL"],
    ssl: true,
    idle_timeout: 30 * 1000, // 30 seconds
    connect_timeout: 2 * 1000, // 2 seconds
    max: 10,
  },
  logger: process.env["SQL_LOG"] ? true : undefined,
  schema: schema,
});
