import { Counter, Rate } from 'k6/metrics';

export const quotaErrors = new Counter('quota_errors');
export const serverErrorCount = new Counter('server_error_count');
export const serverErrors = new Rate('server_errors');
export const rateLimited = new Rate('rate_limited');

export function catatStatus(response) {
  if (response.status === 402) quotaErrors.add(1);
  if (response.status >= 500) serverErrorCount.add(1);
  serverErrors.add(response.status >= 500);
  rateLimited.add(response.status === 429);
}
