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

/** Query for GET /:username/posts (paginated) */
export const writerPostsQuerySchema = z.object({
  offset: z.string().optional().transform((v) => safeNonNegativeInt(v, 0)),
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
});

export type WriterPostsQuery = z.infer<typeof writerPostsQuerySchema>;
