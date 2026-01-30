import { Request } from 'express';
import { Query } from 'mongoose';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export async function paginateQuery<T>(
  query: Query<T[], any>,
  params: PaginationParams,
  countFilter: Record<string, any>,
  Model: any
): Promise<PaginatedResult<T>> {
  const [data, total] = await Promise.all([
    query.skip(params.skip).limit(params.limit),
    Model.countDocuments(countFilter),
  ]);

  const totalPages = Math.ceil(total / params.limit);

  return {
    data: data as T[],
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
