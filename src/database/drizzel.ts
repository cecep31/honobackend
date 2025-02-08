import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schemas/postgre/schema";
import { getSecret } from "../config/secret";

export const db = drizzle(getSecret.db_url, { schema });
