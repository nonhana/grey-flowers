import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { blockInsertChange } from './markdown-ops';

const BLOCK = '::music-player{ids="1"}\n::';

/** 在 `|` 处放光标，应用插入后返回新文档与光标位置 */
const insertAtCaret = (marked: string) => {
  const head = marked.indexOf('|');
  const source = marked.replace('|', '');
  const change = blockInsertChange(Text.of(source.split('\n')), head, BLOCK);
  const doc = `${source.slice(0, change.from)}${change.insert}${source.slice(change.to)}`;
  return { cursor: change.cursor, doc };
};

describe('blockInsertChange', () => {
  it('在段落中间插入：接在该行后，并与前后段落各隔一个空行', () => {
    const { doc } = insertAtCaret('前文|续写\n下一段');

    expect(doc).toBe(`前文续写\n\n${BLOCK}\n\n下一段`);
  });

  it('光标在空行：占用这个空行，与上一段补一个空行', () => {
    const { doc } = insertAtCaret('上一段\n|\n下一段');

    expect(doc).toBe(`上一段\n\n${BLOCK}\n\n下一段`);
  });

  it('后面已有空行时不再多补，光标落在那个空行上', () => {
    const { cursor, doc } = insertAtCaret('前文|\n\n后文');

    expect(doc).toBe(`前文\n\n${BLOCK}\n\n后文`);
    expect(doc.slice(cursor)).toBe('\n后文');
  });

  it('文末插入：补一个换行，光标落在新的空行上', () => {
    const { cursor, doc } = insertAtCaret('只有一段|');

    expect(doc).toBe(`只有一段\n\n${BLOCK}\n`);
    expect(cursor).toBe(doc.length);
  });

  it('空文档直接写入，不补前导空行', () => {
    const { doc } = insertAtCaret('|');

    expect(doc).toBe(`${BLOCK}\n`);
  });
});
