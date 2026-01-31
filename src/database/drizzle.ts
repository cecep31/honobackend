import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schemas/postgre/schema";
import config from "../config";

export const db = drizzle({
  connection: {
    url: config.database.url,
    max: config.database.max_connections,
    idleTimeout: config.database.idle_timeout,
    connectionTimeout: config.database.connect_timeout,
    maxLifetime: config.database.max_lifetime,
  },
  schema,
});
