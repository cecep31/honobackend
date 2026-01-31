import { z } from "zod";

export const getCommentsQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
