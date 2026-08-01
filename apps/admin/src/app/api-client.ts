import type { AppType } from '@grey-flowers/api';

import { hc } from 'hono/client';

export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}
