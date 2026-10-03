import type { EditorState, Text } from '@codemirror/state';

import { isInsideCode } from '@/ui/editor/markdown-ops';

export interface MusicDirective {
  from: number;
  to: number;
  attrFrom: number;
  attrTo: number;
  ids: number[];
}

const OPEN_PREFIX = '::music-player{';
const OPEN_LINE = /^::music-player\{(.*)\}[ \t]*$/;
const IDS_ATTR = /(?:^|\s)(ids=(?:"([^"]*)"|'([^']*)'|([^\s"'}]+)))(?=\s|$)/;

export const formatMusicIdsAttr = (ids: readonly number[]) =>
  `ids="${ids.join(',')}"`;

export const formatMusicDirective = (ids: readonly number[]) =>
  `::music-player{${formatMusicIdsAttr(ids)}}\n::`;

const parseIds = (value: string) => {
  const items = value.split(',').map((item) => item.trim());
  return items.every((item) => /^[1-9]\d*$/.test(item))
    ? items.map(Number)
    : null;
};

export const findMusicDirectives = (
  doc: Text,
  inCode: (position: number) => boolean,
): MusicDirective[] => {
  const found: MusicDirective[] = [];

  for (let number = 1; number < doc.lines; number++) {
    const open = doc.line(number);
    if (!open.text.startsWith(OPEN_PREFIX)) continue;

    const close = doc.line(number + 1);
    if (close.text.trimEnd() !== '::') continue;

    const body = OPEN_LINE.exec(open.text)?.[1];
    const attr = body === undefined ? null : IDS_ATTR.exec(body);
    if (!attr) continue;

    const [matched, token = '', quoted, single, bare] = attr;
    const ids = parseIds(quoted ?? single ?? bare ?? '');
    if (!ids || inCode(open.from)) continue;

    const attrFrom =
      open.from +
      OPEN_PREFIX.length +
      attr.index +
      matched.length -
      token.length;
    found.push({
      from: open.from,
      to: close.to,
      attrFrom,
      attrTo: attrFrom + token.length,
      ids,
    });
    number++;
  }

  return found;
};

export const musicDirectivesIn = (state: EditorState) =>
  findMusicDirectives(state.doc, (position) =>
    isInsideCode({ state }, position),
  );

export const locateMusicDirective = (state: EditorState, position: number) =>
  musicDirectivesIn(state).find(
    (directive) => directive.from <= position && position <= directive.to,
  );
