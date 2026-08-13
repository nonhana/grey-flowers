import { useState } from 'react';

/**
 * React 官方「按输入调整 state」模式的渲染期 compare-and-reset 封装。
 *
 * `value` 变化时会在同一次渲染里同步内部 prev 并调用 `onReset` —— 还原了
 * 手势必须发生在渲染期（放进 effect 会触发级联渲染）。典型用法：
 *
 *   useDerivedReset(requestKey, () => {
 *     setLoading(true)
 *     setError('')
 *   })
 *
 *   或对话框开关重置表单：
 *
 *   useDerivedReset(open, () => {
 *     if (open) { /* 打开时重置 *\/ }
 *   })
 */
export const useDerivedReset = <T>(value: T, onReset: () => void) => {
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    onReset();
  }
};
