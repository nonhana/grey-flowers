import { lazyRouteComponent } from '@tanstack/react-router';

import { Skeleton } from '@/ui/feedback.js';
import { PageBody } from '@/ui/surface.js';

const RoutePending = () => (
  <PageBody>
    <div className="grid animate-content-in gap-4">
      <div className="grid gap-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div
        aria-hidden
        className="
          overflow-hidden rounded-panel border border-rule bg-case-raised
          [&>*+*]:border-t [&>*+*]:border-rule
        "
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div className="grid gap-2 px-4 py-3.5" key={index}>
            <Skeleton className="h-[1.6em] w-1/3 text-md" />
            <Skeleton className="h-[1.55em] w-2/3 text-base" />
            <Skeleton className="h-[1.45em] w-1/4 text-2xs" />
          </div>
        ))}
      </div>
    </div>
  </PageBody>
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
