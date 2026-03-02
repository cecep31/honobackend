import { z } from "zod";

const safeLimit = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1
    ? Math.min(100, Math.max(1, Math.floor(n)))
    : fallback;
};

const safeOffset = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

export const getCommentsQuerySchema = z.object({
  offset: z.string().optional().default("0").transform((v) => safeOffset(v, 0)),
  limit: z.string().optional().default("20").transform((v) => safeLimit(v, 20)),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
