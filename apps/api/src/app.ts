import { Hono } from 'hono';

export function createApp<TDependencies>(dependencies: TDependencies) {
  void dependencies;

  return new Hono();
}

export type AppType = ReturnType<typeof createApp>;
