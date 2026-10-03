import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { findMusicDirectives, formatMusicDirective } from './music-directive';

const find = (
  source: string,
  inCode: (position: number) => boolean = () => false,
) => findMusicDirectives(Text.of(source.split('\n')), inCode);

describe('findMusicDirectives', () => {
  it('把独占行首的叶子指令识别成一段，区间覆盖开头行与闭合行', () => {
    const source = '正文\n\n::music-player{ids="3,5"}\n::\n\n后文';
    const [directive] = find(source);

    expect(directive?.ids).toEqual([3, 5]);
    expect(source.slice(directive?.from, directive?.to)).toBe(
      '::music-player{ids="3,5"}\n::',
    );
    expect(source.slice(directive?.attrFrom, directive?.attrTo)).toBe(
      'ids="3,5"',
    );
  });

  it('属性区间只含 ids，其余属性、引号写法与闭合行尾空白都不影响识别', () => {
    const source = "::music-player{class=wide ids='7' title=x}  \n::  ";
    const [directive] = find(source);

    expect(directive?.ids).toEqual([7]);
    expect(source.slice(directive?.attrFrom, directive?.attrTo)).toBe(
      "ids='7'",
    );
  });

  it('不带引号的单个 id 也能识别', () => {
    expect(find('::music-player{ids=12}\n::')[0]?.ids).toEqual([12]);
  });

  it('格式化出来的指令能被原样识别回来', () => {
    const [directive] = find(formatMusicDirective([4, 9, 2]));

    expect(directive?.ids).toEqual([4, 9, 2]);
  });

  it('相邻的两段指令各自识别，互不吞并', () => {
    const found = find(
      '::music-player{ids="1"}\n::\n::music-player{ids="2"}\n::',
    );

    expect(found.map((directive) => directive.ids)).toEqual([[1], [2]]);
  });

  it.each([
    ['缺少闭合行', '::music-player{ids="3"}\n正文'],
    ['闭合行带多余内容', '::music-player{ids="3"}\n::x'],
    ['最后一行没有闭合行', '::music-player{ids="3"}'],
    ['行内写法', '正文 :music-player{ids="3"} 正文\n::'],
    ['行首缩进', '  ::music-player{ids="3"}\n::'],
    ['没有 ids 属性', '::music-player{}\n::'],
    ['ids 含非数字', '::music-player{ids="3,a"}\n::'],
    ['ids 含零', '::music-player{ids="0"}\n::'],
    ['ids 为空', '::music-player{ids=""}\n::'],
    ['ids 里有空项', '::music-player{ids="3,,5"}\n::'],
  ])('%s：不接管，原样显示成文本', (_name, source) => {
    expect(find(source)).toEqual([]);
  });

  it('落在代码语境里的示例不渲染', () => {
    const source = '```md\n::music-player{ids="3"}\n::\n```';

    expect(find(source, () => true)).toEqual([]);
    expect(find(source)).toHaveLength(1);
  });
});
