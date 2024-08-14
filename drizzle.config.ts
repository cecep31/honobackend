import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/database/schema/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env["DATABASE_URL"]!
    },
    verbose: true,
    strict: true
})