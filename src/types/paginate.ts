export interface PaginationParams {
  offset?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface GetPaginationParams {
  offset: number;
  limit: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
