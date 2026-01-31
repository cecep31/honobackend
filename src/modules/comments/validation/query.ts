import { z } from "zod";

const safeLimit = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1
    ? Math.min(100, Math.max(1, Math.floor(n)))
    : fallback;
};
const safePage = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};

export const getCommentsQuerySchema = z.object({
  page: z.string().optional().default("1").transform((v) => safePage(v, 1)),
  limit: z.string().optional().default("20").transform((v) => safeLimit(v, 20)),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
