import { lazyRouteComponent } from '@tanstack/react-router';

import { Spinner } from '@/ui/index.js';

const RoutePending = () => (
  <div className="grid h-full min-h-[50vh] place-items-center">
    <Spinner label="加载中" />
  </div>
);

export const lazyPage = <
  Module extends Record<string, unknown>,
  ComponentName extends keyof Module & string,
>(
  importer: () => Promise<Module>,
  componentName: ComponentName,
) => {
  const component = lazyRouteComponent(importer, componentName);
  return { component, pendingComponent: RoutePending };
};
