export const getSecret = {
    jwt_secret: process.env["JWT_SECRET"] ?? "",
    db_url: process.env["DATABASE_URL"] ?? ""
}