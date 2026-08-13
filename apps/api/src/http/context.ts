import type { Principal } from '@grey-flowers/contracts';
import type { HttpBindings } from '@hono/node-server';

import type { AppDependencies } from '../bootstrap/dependencies.js';

export interface ApiVariables {
  dependencies: AppDependencies;
  principal: Principal;
  requestId: string;
}

export interface ApiEnvironment {
  Bindings: HttpBindings;
  Variables: ApiVariables;
}
