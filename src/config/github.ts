export const credential = {
  CLIENT_ID: process.env["GITHUB_CLIENT_ID"],
  CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"],
  REDIRECT_URI : process.env["GITHUB_REDIRECT_URI"] || "https://hono.pilput.dev/auth/github/callback"
};
