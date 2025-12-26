import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schemas/postgre/schema";
import config from "../config";

const client = new SQL(config.database.url, {
  max: config.database.max_connections,
  idleTimeout: config.database.idle_timeout,
  connectTimeout: config.database.connect_timeout,
  maxLifetime: config.database.max_lifetime,
});

export const db = drizzle(client, { schema });
