import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas/postgre/schema";
import config from "../config";

const client = postgres(config.database.url, {
  max: config.database.max_connections,
  idle_timeout: config.database.idle_timeout,
  connect_timeout: config.database.connect_timeout,
  max_lifetime: config.database.max_lifetime,
});

export const db = drizzle(client, { schema });