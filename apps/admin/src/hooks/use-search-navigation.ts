import { useNavigate } from '@tanstack/react-router';

export const useSearchNavigation = <TSearch extends object>(
  to: string,
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
