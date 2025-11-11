export interface Ipagination {
  page: number;
  limit: number;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}
