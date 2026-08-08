import { useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';

/**
 * 把组件的某条边变成可拖拽调整尺寸的把手。
 *
 * 只负责手势与几何：pointer 拖拽、方向换算、min/max 钳制、键盘调节，
 * 以及拖拽期间的文本选择抑制。吸附/阈值/折叠等业务状态机由调用方在
 * onResize 里根据 meta.raw（未钳制的原始建议尺寸）自行处理。
 *
 * 尺寸方向约定：edge 为 right/bottom 时，把手向外拖（+x/+y）尺寸增大；
 * left/top 相反。键盘方向与边无关：ArrowLeft/Up 减小，ArrowRight/Down 增大，
 * Home 到 min，End 到 max。
 */
export type ResizeEdge = 'top' | 'right' | 'bottom' | 'left';

export type ResizeSource = 'pointer' | 'keyboard';

export interface ResizeChange {
  /** 未钳制的原始建议尺寸（阈值/吸附判断用） */
  raw: number;
  /** 变化来源：拖拽或键盘 */
  source: ResizeSource;
}

export interface UseResizableEdgeOptions {
  /** 被调整尺寸的元素；pointerdown / 键盘调节时从这里读取当前尺寸 */
  ref: RefObject<HTMLElement | null>;
  /** 挂把手的那条边 */
  edge: ResizeEdge;
  /** 尺寸下钳（px） */
  min?: number;
  /** 尺寸上钳（px） */
  max?: number;
  /** 键盘单步（px） */
  keyboardStep?: number;
  /** 尺寸变化回调。size 为钳制后的建议尺寸，meta 提供未钳制值与来源。 */
  onResize: (size: number, change: ResizeChange) => void;
  /** 一次拖拽结束（pointerup / pointercancel） */
  onResizeEnd?: () => void;
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
    // right/bottom：正方向拖拽使尺寸增大；left/top 相反。
    const sign = edge === 'right' || edge === 'bottom' ? 1 : -1;

    const apply = (clientX: number, clientY: number) => {
      const delta = horizontal ? clientY - startY : clientX - startX;
      const raw = startSize + sign * delta;
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
      onResizeEnd?.();
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
