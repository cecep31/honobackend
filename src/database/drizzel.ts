import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schemas/postgre/schema";

export const db = drizzle({
  connection: {
    url: process.env["DATABASE_URL"],
    ssl: true,
  },
  logger: true,
  schema: schema,
});

