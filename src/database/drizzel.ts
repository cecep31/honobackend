import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schemas/postgre/schema";


export const db = drizzle({
  connection: {
    url: process.env["DATABASE_URL"],
    ssl: true,
    idle_timeout: 30 * 1000, // 30 seconds
    connect_timeout: 45 * 1000, // 45 seconds
  },
  logger: undefined,
  schema: schema,
});
