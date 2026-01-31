import { z } from "zod";

const safeNonNegativeInt = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};
const safeLimit = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1
    ? Math.min(100, Math.max(1, Math.floor(n)))
    : fallback;
};

/** Query for list/paginated endpoints: GET /, GET /:id/followers, GET /:id/following */
export const listUsersQuerySchema = z.object({
  offset: z.string().optional().transform((v) => safeNonNegativeInt(v, 0)),
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
  search: z.string().optional(),
  q: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

/** Query for GET /me - include profile or not */
export const meQuerySchema = z.object({
  profile: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type MeQuery = z.infer<typeof meQuerySchema>;
