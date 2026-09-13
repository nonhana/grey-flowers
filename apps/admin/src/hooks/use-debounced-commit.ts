import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export const useDebouncedCommit = <Arguments extends unknown[]>(
  fn: (...args: Arguments) => void,
  delayMs: number,
) => {
  const commit = useDebouncedCallback(fn, delayMs);
  useEffect(() => () => commit.cancel(), [commit]);
  return commit;
};
