import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schemas/postgre/schema";
import config from '../config'

const client = new SQL(config.database.url);

export const db = drizzle({ client, schema });
