import { createRootRoute } from '@tanstack/react-router';

import { ConsoleShell } from '@/app/shell/console-shell';

export const Route = createRootRoute({ component: ConsoleShell });
