import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schemas/postgre/schema";
import { getSecret } from "../config/secret";

export const db = drizzle({
  connection: {
    url: getSecret.db_url,
    ssl: "prefer",
    max: 50,
    connect_timeout: 30000,
    idle_timeout: 60000,
  },
  schema: schema,
});
