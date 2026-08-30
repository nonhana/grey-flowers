import { useState } from 'react';

export interface DialogStore<T> {
  isOpen: boolean;
  data: T | null;
  /** 单调递增的打开会话 id：每次 open(data) 都 +1，同一 data 重开亦然。 */
  session: number;
  open: (data: T) => void;
  dismiss: () => void;
  clear: () => void;
}

interface DialogState<T> {
  data: T | null;
  isOpen: boolean;
  session: number;
}

export const useDialog = <T>(): DialogStore<T> => {
  const [state, setState] = useState<DialogState<T>>({
    data: null,
    isOpen: false,
    session: 0,
  });

  const open = (data: T) =>
    setState((current) => ({
      data,
      isOpen: true,
      session: current.session + 1,
    }));

  const dismiss = () => setState((current) => ({ ...current, isOpen: false }));

  const clear = () =>
    setState((current) =>
      current.isOpen
        ? current
        : { data: null, isOpen: false, session: current.session },
    );

  return {
    data: state.data,
    isOpen: state.isOpen,
    session: state.session,
    open,
    dismiss,
    clear,
  };
};
