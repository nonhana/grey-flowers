import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';

import { useState } from 'react';

/** 把手方向：right/bottom 向外拖（+x/+y）尺寸增大，left/top 相反；键盘 Arrow→大、Home→min、End→max */
export type ResizeEdge = 'top' | 'right' | 'bottom' | 'left';

export type ResizeSource = 'pointer' | 'keyboard';

export interface ResizeChange {
  raw: number;
  source: ResizeSource;
}

export interface UseResizableEdgeOptions {
  ref: RefObject<HTMLElement | null>;
  edge: ResizeEdge;
  min?: number;
  max?: number;
  keyboardStep?: number;
  onResize: (size: number, change: ResizeChange) => void;
  onResizeEnd?: (size: number) => void;
}

export interface ResizeHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  role: 'separator';
  'aria-orientation': 'horizontal' | 'vertical';
  'aria-valuemin': number;
  'aria-valuemax'?: number;
  tabIndex: 0;
  style: { touchAction: 'none' };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isHorizontal = (edge: ResizeEdge) => edge === 'top' || edge === 'bottom';

const sizeOf = (element: HTMLElement, edge: ResizeEdge) => {
  const rect = element.getBoundingClientRect();
  return isHorizontal(edge) ? rect.height : rect.width;
};

export const useResizableEdge = ({
  ref,
  edge,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  keyboardStep = 16,
  onResize,
  onResizeEnd,
}: UseResizableEdgeOptions): {
  handleProps: ResizeHandleProps;
  isResizing: boolean;
} => {
  const [isResizing, setIsResizing] = useState(false);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = ref.current;
    if (!target) return;

    const handle = event.currentTarget;
    const startSize = sizeOf(target, edge);
    const startX = event.clientX;
    const startY = event.clientY;
    const horizontal = isHorizontal(edge);
    const sign = edge === 'right' || edge === 'bottom' ? 1 : -1;
    let lastRaw = startSize;

    const apply = (clientX: number, clientY: number) => {
      const delta = horizontal ? clientY - startY : clientX - startX;
      const raw = startSize + sign * delta;
      lastRaw = raw;
      onResize(clamp(raw, min, max), { raw, source: 'pointer' });
    };

    handle.setPointerCapture(event.pointerId);
    setIsResizing(true);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    event.preventDefault();

    const onPointerMove = (move: PointerEvent) =>
      apply(move.clientX, move.clientY);
    const finish = () => {
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      document.body.style.userSelect = previousUserSelect;
      setIsResizing(false);
      onResizeEnd?.(clamp(lastRaw, min, max));
    };

    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = ref.current;
    if (!target) return;

    const size = sizeOf(target, edge);
    let raw: number | null = null;
    if (isHorizontal(edge)) {
      if (event.key === 'ArrowUp') raw = size - keyboardStep;
      else if (event.key === 'ArrowDown') raw = size + keyboardStep;
    } else {
      if (event.key === 'ArrowLeft') raw = size - keyboardStep;
      else if (event.key === 'ArrowRight') raw = size + keyboardStep;
    }
    if (event.key === 'Home') raw = min;
    else if (event.key === 'End') raw = max;
    if (raw === null) return;
    event.preventDefault();
    onResize(clamp(raw, min, max), { raw, source: 'keyboard' });
  };

  return {
    isResizing,
    handleProps: {
      onPointerDown,
      onKeyDown,
      role: 'separator',
      'aria-orientation': isHorizontal(edge) ? 'horizontal' : 'vertical',
      'aria-valuemin': min,
      'aria-valuemax': Number.isFinite(max) ? max : undefined,
      tabIndex: 0,
      style: { touchAction: 'none' },
    },
  };
};
