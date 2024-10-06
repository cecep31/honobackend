import type { Context } from "hono";
import type { GetPaginationParams } from "../types/paginate";

export const getPaginationParams = (c: Context): GetPaginationParams => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  return { page, limit };
};

export const getPaginationMetadata = (
  total: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
  };
};
