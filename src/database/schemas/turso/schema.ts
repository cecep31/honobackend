import { sqliteTable, text,   } from 'drizzle-orm/sqlite-core';

export const activity = sqliteTable("activities",{
    activity_id: text().primaryKey(),
    activity_type: text(),
    user_id: text(),
    data: text(),
    created_at: text(),
    updated_at: text(),
    deleted_at: text(),
})