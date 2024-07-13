import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/schema";

const queryClient = postgres(process.env.DATABASE_URL!, {
  max: parseInt(process.env.MAX_CONNECTION || "10"),
});

export const db = drizzle(queryClient, {
  schema: schema,
  logger: process.env.SQL_LOG ? true : undefined,
});