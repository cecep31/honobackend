import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/schema';

const queryClient = postgres(process.env.DATABASE_URL!, { max: 15 });

export const db = drizzle(queryClient, { schema: schema, logger: process.env.NODE_ENV === 'production' ? undefined : true });

