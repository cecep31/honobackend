import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schemas/postgre/schema";
import { getSecret } from "../config/secret";

const client = new SQL(getSecret.db_url);

export const db = drizzle({ client, schema });
