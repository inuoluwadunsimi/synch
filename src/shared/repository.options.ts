import {
  FilterQuery,
  Model,
  PipelineStage,
  UpdateQuery,
  ProjectionType,
} from "mongoose";
export interface RepositoryOptions {
  sort?: Record<string, 1 | -1>;
  population?: string[];
  limit?: number;
  page?: number;
  projection?: ProjectionType<any>;
}

export interface Ipagination {
  page: number;
  limit: number;
}

export type PaginatedResult<T> =
  | T[] // If no pagination
  | {
  data: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
};

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}



