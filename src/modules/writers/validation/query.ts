import { z } from "zod";
import { safeLimit, safeOffset } from "../../../utils/request";

/** Query for GET /:username/posts (paginated) */
export const writerPostsQuerySchema = z.object({
  offset: z.string().optional().transform((v) => safeOffset(v, 0)),
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
});

export type WriterPostsQuery = z.infer<typeof writerPostsQuerySchema>;
