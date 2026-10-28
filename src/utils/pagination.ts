export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parses and sanitizes pagination query parameters.
 * Prevents negative values, zero, and excessively large limits.
 */
export function parsePagination(query: Record<string, any>): PaginationParams {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit };
}

/**
 * Calculates offset for SQL LIMIT/OFFSET and builds response metadata.
 */
export function buildPaginationMeta(
  params: PaginationParams,
  totalRecords: number,
): { offset: number; meta: PaginationMeta } {
  const totalPages = Math.ceil(totalRecords / params.limit) || 1;

  return {
    offset: (params.page - 1) * params.limit,
    meta: {
      current_page: params.page,
      page_size: params.limit,
      total_records: totalRecords,
      total_pages: totalPages,
    },
  };
}
