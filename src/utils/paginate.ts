import type { Context } from "hono";
import type { GetPaginationParams } from "../types/paginate";

export const getPaginationParams = (c: Context): GetPaginationParams => {
  const offset = Number(c.req.query("offset")) || 0;
  const limit = Number(c.req.query("limit")) || 10;
  const search = c.req.query("search") || undefined;
  const orderBy = c.req.query("orderBy") || undefined;
  const orderDirection = c.req.query("orderDirection") === 'asc' ? 'asc' : 'desc';
  return { offset, limit, search, orderBy, orderDirection };
};

export const getPaginationMetadata = (
  total: number,
  offset: number,
  limit: number
) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total_items: total,
    offset,
    limit,
    total_pages: totalPages,
  };
};
