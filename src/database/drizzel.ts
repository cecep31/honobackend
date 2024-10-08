import { drizzle } from "drizzle-orm/connect";
import * as schema from "./schema/schema";
import { getSecret } from "../config/secret";

export const db = await drizzle("postgres-js", {
  connection: getSecret.db_url ?? "",
  schema: schema,
  logger: process.env["SQL_LOG"] ? true : undefined,
});