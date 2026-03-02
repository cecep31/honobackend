import { z } from "zod";
import { safeLimit, safeOffset } from "../../../utils/request";

export const getCommentsQuerySchema = z.object({
  offset: z.string().optional().default("0").transform((v) => safeOffset(v, 0)),
  limit: z.string().optional().default("20").transform((v) => safeLimit(v, 20)),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
