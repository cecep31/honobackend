import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas/postgre/schema";
import config from '../config'

// Create PostgreSQL client with connection pooling configuration from config
const client = postgres(config.database.url, {
  max: config.database.max_connections,                    // Maximum number of connections in the pool
  idle_timeout: config.database.idle_timeout,              // Seconds before idle connections are closed
  connect_timeout: config.database.connect_timeout,       // Seconds to wait for a connection
  max_lifetime: config.database.max_lifetime,               // Maximum lifetime of a connection in seconds
  prepare: config.database.prepare_statements              // Enable prepared statements for better performance
});

export const db = drizzle({ client, schema });
