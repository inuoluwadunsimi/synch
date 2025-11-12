import { FilterQuery, ProjectionType, PopulateOptions } from 'mongoose';

export interface BaseQuery {
  search?: string;
  sort?: Record<string, 1 | -1>;
  population?: PopulateOptions | PopulateOptions[] | string[];
  limit?: number;
  page?: number;
}

export type PaginatedResult<T> =
  | T[] // If no pagination
  | {
      data: T[];
      totalItems: number;
      itemCount: number;
      currentPage: number;
      totalPages: number;
    };

export interface RepositoryOptions {
  sort?: Record<string, 1 | -1>;
  population?: string[];
  limit?: number;
  page?: number;
  projection?: ProjectionType<any>;
}
