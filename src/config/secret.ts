export const getSecret = {
    jwt_secret: process.env["JWT_KEY"] ?? "",
    db_url: process.env["DATABASE_URL"] ?? ""
}