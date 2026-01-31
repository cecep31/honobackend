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

/** Query for GET /conversations (paginated list) */
export const listConversationsQuerySchema = z.object({
  offset: z.string().optional().transform((v) => safeNonNegativeInt(v, 0)),
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
  search: z.string().optional(),
  q: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListConversationsQuery = z.infer<
  typeof listConversationsQuerySchema
>;
