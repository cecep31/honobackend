import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzle_neon } from "drizzle-orm/neon-serverless";
import * as schema from "./schemas/postgre/schema";
import { getSecret } from "../config/secret";

export const db_old = drizzle({
  connection: {
    url: getSecret.db_url,
    ssl: "prefer",
    max: 10,
  },
  schema: schema,
});

export const db = drizzle_neon({
  connection: getSecret.db_url,
  schema: schema,
});

