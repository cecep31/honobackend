import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import * as schema from "./schemas/postgre/schema";
import { getSecret } from "../config/secret";

// Create the connection pool
const connection = postgres(getSecret.db_url, {
  ssl: 'prefer',
  max: 30,
  max_lifetime: 60 * 60, // 1 hour
  idle_timeout: 20 * 60, // 20 minutes
  connect_timeout: 10,
  prepare: false
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing database connection');
  connection.end().then(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing database connection');
  connection.end().then(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

export const db = drizzle(connection, { schema });
