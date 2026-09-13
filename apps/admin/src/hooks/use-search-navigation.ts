import { useNavigate } from '@tanstack/react-router';

import type { FileRouteTypes } from '../routeTree.gen';

export const useSearchNavigation = <TSearch extends object>(
  to: FileRouteTypes['to'],
  search: TSearch,
) => {
  const navigate = useNavigate();
  return (patch: Partial<TSearch>, replace = false) => {
    void navigate({
      to,
      replace,
      search: { ...search, ...patch },
    });
  };
};
