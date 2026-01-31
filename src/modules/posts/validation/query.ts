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

/** Query untuk list posts (paginate): GET /, GET /me, GET /author/:username */
export const listPostsQuerySchema = z.object({
  offset: z.string().optional().transform((v) => safeNonNegativeInt(v, 0)),
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
  search: z.string().optional(),
  q: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

/** Query untuk chart posts-over-time */
export const postsOverTimeQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .default("30")
    .transform((v) =>
      Number.isFinite(Number(v))
        ? Math.min(365, Math.max(1, Math.floor(Number(v))))
        : 30
    ),
  groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
});

/** Query untuk chart endpoints yang pakai limit (posts-by-tag, top-by-views, dll) */
export const chartLimitQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((v) => safeLimit(v, 10)),
});

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type PostsOverTimeQuery = z.infer<typeof postsOverTimeQuerySchema>;
export type ChartLimitQuery = z.infer<typeof chartLimitQuerySchema>;
