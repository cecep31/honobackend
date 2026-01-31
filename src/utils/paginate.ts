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
