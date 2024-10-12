import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "./schema/schema";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] }); 

export const db = drizzle(pool, { 
  schema: schema, 
  logger: process.env["SQL_LOG"] ? true : undefined 
});