export interface IApiResponse<T = any> {
  message?: string;
  statusCode?: number;
  data?: T;
  meta?: any;
}
