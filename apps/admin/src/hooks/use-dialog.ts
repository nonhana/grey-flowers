import { useState } from 'react';

export interface DialogStore<T> {
  isOpen: boolean;
  data: T | null;
  open: (data: T) => void;
  dismiss: () => void;
  clear: () => void;
}

export const useDialog = <T>(): DialogStore<T> => {
  const [state, setState] = useState<{ data: T | null; isOpen: boolean }>({
    data: null,
    isOpen: false,
  });

  const open = (data: T) => setState({ data, isOpen: true });

  const dismiss = () => setState((current) => ({ ...current, isOpen: false }));

  const clear = () =>
    setState((current) =>
      current.isOpen ? current : { data: null, isOpen: false },
    );

  return {
    data: state.data,
    isOpen: state.isOpen,
    open,
    dismiss,
    clear,
  };
};
