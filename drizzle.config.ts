import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schemas/postgres/schema.ts',
  out: './drizzle',
  migrations: {
    table: 'my-migrations-table', // `__drizzle_migrations` by default
    schema: 'public', // used in PostgreSQL only, `drizzle` by default
  },
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
