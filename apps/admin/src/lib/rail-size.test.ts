import { describe, expect, it } from 'vitest';

import { RAIL_SIZE, resolveRailSize } from './rail-size.js';

const expanded = { collapsed: false, width: RAIL_SIZE.default } as const;

describe('resolveRailSize · 拖拽（pointer）', () => {
  it('展开态：宽度跟随鼠标位置，钳在 [min, max]', () => {
    expect(resolveRailSize(expanded, 230)).toEqual({
      collapsed: false,
      width: 230,
    });
    expect(resolveRailSize(expanded, RAIL_SIZE.min - 1)).toEqual({
      collapsed: false,
      width: RAIL_SIZE.min,
    });
    expect(resolveRailSize(expanded, 9999)).toEqual({
      collapsed: false,
      width: RAIL_SIZE.max,
    });
  });

  it('展开态：鼠标到达折叠宽度才折叠，记忆宽度不变', () => {
    expect(resolveRailSize(expanded, RAIL_SIZE.collapsed)).toEqual({
      collapsed: true,
      width: RAIL_SIZE.default,
    });
    // 钳制带内（X, Y] 保持展开在最小宽度，不折叠。
    expect(resolveRailSize(expanded, RAIL_SIZE.collapsed + 1)).toEqual({
      collapsed: false,
      width: RAIL_SIZE.min,
    });
  });

  it('折叠态：未拖到最小宽度前保持折叠', () => {
    const collapsed = { collapsed: true, width: 300 };
    expect(resolveRailSize(collapsed, RAIL_SIZE.min - 1)).toEqual(collapsed);
    expect(resolveRailSize(collapsed, RAIL_SIZE.collapsed)).toEqual(collapsed);
  });

  it('折叠态：拖到最小宽度即展开并接管鼠标位置', () => {
    expect(
      resolveRailSize({ collapsed: true, width: 300 }, RAIL_SIZE.min),
    ).toEqual({ collapsed: false, width: RAIL_SIZE.min });
    expect(resolveRailSize({ collapsed: true, width: 300 }, 320)).toEqual({
      collapsed: false,
      width: 320,
    });
    expect(resolveRailSize({ collapsed: true, width: 300 }, 9999)).toEqual({
      collapsed: false,
      width: RAIL_SIZE.max,
    });
  });
});

describe('resolveRailSize · 键盘（keyboard）', () => {
  it('展开态：目标宽度低于最小宽度即折叠（步进可穿过钳制带）', () => {
    expect(resolveRailSize(expanded, RAIL_SIZE.min - 16, 'keyboard')).toEqual({
      collapsed: true,
      width: RAIL_SIZE.default,
    });
    // 未低于最小宽度时正常钳制。
    expect(resolveRailSize(expanded, RAIL_SIZE.min, 'keyboard')).toEqual({
      collapsed: false,
      width: RAIL_SIZE.min,
    });
  });

  it('折叠态：向右展开并恢复记忆宽度', () => {
    expect(
      resolveRailSize(
        { collapsed: true, width: 300 },
        RAIL_SIZE.collapsed + 16,
        'keyboard',
      ),
    ).toEqual({ collapsed: false, width: 300 });
  });

  it('折叠态：End 展开到最大宽度', () => {
    expect(
      resolveRailSize(
        { collapsed: true, width: 300 },
        RAIL_SIZE.max,
        'keyboard',
      ),
    ).toEqual({ collapsed: false, width: RAIL_SIZE.max });
  });

  it('折叠态：向左保持折叠', () => {
    const collapsed = { collapsed: true, width: 300 };
    expect(
      resolveRailSize(collapsed, RAIL_SIZE.collapsed - 16, 'keyboard'),
    ).toEqual(collapsed);
  });
});
