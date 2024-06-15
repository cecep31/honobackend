import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/schema/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!
    },
    verbose: true,
    strict: true
})