export const originList = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://pilput.dev",
    "https://www.pilput.dev",
    "https://app.pilput.dev",
    "https://dash.pilput.dev",
    "https://pilput.me",
];

export const rateLimitConfig = {
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: process.env["RATE_LIMIT_MAX"] ? Number(process.env["RATE_LIMIT_MAX"]) : 150, // Limit each IP to 300 requests per `window` (here, per 1 minute).
}
