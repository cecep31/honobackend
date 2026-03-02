import { z } from "zod";
import { safeLimit, safeOffset } from "../../../utils/request";

/** Query for GET /conversations (paginated list) */
export const listConversationsQuerySchema = z.object({
  offset: z.string().optional().transform((v) => safeOffset(v, 0)),
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
  search: z.string().optional(),
  q: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListConversationsQuery = z.infer<
  typeof listConversationsQuerySchema
>;
