export const getSecret = {
    jwt_secret: process.env["JWT_SECRET"] ?? "",
    db_url: process.env["DATABASE_URL"] ?? ""
}

export function requireSecrets() {
    const missing: string[] = [];
    if (!getSecret.jwt_secret) missing.push("JWT_SECRET");
    if (!getSecret.db_url) missing.push("DATABASE_URL");
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
}
