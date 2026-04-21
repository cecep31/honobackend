import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/postgres/schema';
import config from '../config';

const client = postgres(config.database.url, {
  max: config.database.maxConnections,
  idle_timeout: config.database.idleTimeout,
  connect_timeout: config.database.connectTimeout,
  max_lifetime: config.database.maxLifetime,
});

export const db = drizzle(client, { schema });
