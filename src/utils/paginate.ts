import type { Context } from "hono";
import type { GetPaginationParams } from "../types/paginate";

export const getPaginationParams = (c: Context): GetPaginationParams => {
  const offset = Number(c.req.query("offset")) || 0;
  const limit = Number(c.req.query("limit")) || 10;
  return { offset, limit };
};

export const getPaginationMetadata = (
  total: number,
  offset: number,
  limit: number
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = offset < totalPages;
  const hasPrevPage = offset > 0;

  return {
    currentPage: offset,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
  };
};
