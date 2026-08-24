import { useState } from 'react';

/**
 * React「按输入调整 state」模式的渲染期 compare-and-reset 封装：
 * `value` 变化时在同一次渲染里同步内部 prev 并调用 `onReset`
 * （放进 effect 会触发级联渲染）。典型用途：请求条件变化切回加载态、
 * 对话框开关重置表单。
 */
export const useDerivedReset = <T>(value: T, onReset: () => void) => {
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    onReset();
  }
};
