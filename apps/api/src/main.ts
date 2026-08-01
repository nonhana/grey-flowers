import { serve } from "@hono/node-server";
import { createDependencies } from "./bootstrap/dependencies.js";
import { createApp } from "./app.js";
import { readApiEnvironment } from "./env.js";

const environment = readApiEnvironment(process.env);
const dependencies = createDependencies(environment);
const app = createApp(dependencies);

serve({
  fetch: app.fetch,
  port: environment.API_PORT,
});
