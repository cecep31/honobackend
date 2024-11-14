import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schemas/postgres/schema";
import * as schematurso from "./schemas/turso/schema";


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

export const tursodb = drizzleLibsql({
  connection: {
    url: process.env["LIBSQL_URL"] ?? "",
    authToken: process.env["LIBSQL_TOKEN"],
  },
  schema: schematurso
});
