import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/schema";
import { getSecret } from "../config/secret";

const queryClient = postgres(getSecret.db_url ?? "", {
  max: parseInt(process.env["MAX_CONNECTION"] || "10"),
});

export const db = drizzle(queryClient, {
  schema: schema,
  logger: process.env["SQL_LOG"] ? true : undefined,
});