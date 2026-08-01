import { hc } from "hono/client";
import type { AppType } from "@grey-flowers/api";

export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}
