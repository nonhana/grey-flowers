import type { ResizeSource } from '@/hooks/use-resizable-edge.js';

/**
 * 侧栏尺寸状态机的领域常量与纯函数。
 *
 * 拆在 lib 里是为了让状态机脱离 React 组件模块图独立单测：
 * console-rail.tsx 顶层会拉起 auth store 等副作用，测试环境无法承载。
 */

/**
 * 折叠态宽度（图标列）与非折叠态最小宽度。X/Y 之间是钳制带：
 * 拖拽展开在 Y 触发、折叠在 X 触发，阈值分离避免在边界附近抖动。
 */
export const RAIL_SIZE = {
  collapsed: 56,
  min: 208,
  default: 264,
  max: 384,
} as const;

export interface RailSize {
  collapsed: boolean;
  /** 非折叠态宽度；折叠时保留记忆值，展开恢复原样 */
  width: number;
}

/**
 * 侧栏尺寸状态机。target 的语义随来源不同：
 * - pointer：鼠标距 rail 左缘的距离（连续，折叠只在到达 X 时触发）；
 * - keyboard：目标宽度（步进可穿过钳制带，低于最小宽度即折叠）。
 */
export const resolveRailSize = (
  current: RailSize,
  target: number,
  source: ResizeSource = 'pointer',
): RailSize => {
  if (current.collapsed) {
    if (source === 'keyboard') {
      // 键盘：向右（目标大于折叠宽）展开，恢复记忆宽度；向左保持折叠。
      return target > RAIL_SIZE.collapsed
        ? {
            collapsed: false,
            width: Math.max(current.width, Math.min(target, RAIL_SIZE.max)),
          }
        : current;
    }
    // 拖拽：只有拖到最小宽度才展开，展开瞬间接管鼠标位置。
    return target >= RAIL_SIZE.min
      ? { collapsed: false, width: Math.min(target, RAIL_SIZE.max) }
      : current;
  }
  const folds =
    source === 'keyboard'
      ? target < RAIL_SIZE.min
      : target <= RAIL_SIZE.collapsed;
  if (folds) return { collapsed: true, width: current.width };
  return {
    collapsed: false,
    width: Math.min(Math.max(target, RAIL_SIZE.min), RAIL_SIZE.max),
  };
};
