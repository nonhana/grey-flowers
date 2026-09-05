import { serve } from '@hono/node-server';

import { createApp } from './app';
import { createDependencies } from './bootstrap/dependencies';
import { readApiEnvironment } from './env';

const environment = readApiEnvironment(process.env);
const dependencies = createDependencies(environment);
const app = createApp(dependencies);

const server = serve(
  {
    fetch: app.fetch,
    port: environment.API_PORT,
  },
  (info) => {
    dependencies.logger.info(
      `🚀 server listening on http://localhost:${info.port}`,
    );
    process.send?.('ready');
  },
);

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    dependencies.logger.error(
      `❌ cannot listen on port ${environment.API_PORT}: address already in use`,
    );
  } else {
    dependencies.logger.error({ err: error }, `❌ failed to start server`);
  }
  process.exit(1);
});
