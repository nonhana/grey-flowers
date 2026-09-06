type QueryValue = string | number | undefined;

/** query -> URLSearchParams */
export const toSearchParams = (query: Record<string, QueryValue>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  return params;
};
