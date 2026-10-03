import type { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import { syntaxTree } from '@codemirror/language';
import { StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

import { isApiRequestError } from '@/app/api/errors';
import { ensureMusicDetail } from '@/app/server-state/modules/music';
import { formatDuration } from '@/lib/format';

import { removeMusicDirective } from './doc-rewrite';
import { musicDirectivesIn } from './music-directive';

export interface MusicActions {
  change: (position: number) => void;
}

export const musicActions: { current: MusicActions | null } = {
  current: null,
};

const ROW_HEIGHT = 52;

const renderRow = (id: number) => {
  const row = document.createElement('div');
  row.className = 'gf-live-music-row';

  const title = document.createElement('span');
  title.className = 'gf-live-music-title';
  title.textContent = `曲目 #${String(id)}`;

  const meta = document.createElement('span');
  meta.className = 'gf-live-music-meta';
  meta.textContent = '加载中…';

  const text = document.createElement('span');
  text.className = 'gf-live-music-text';
  text.append(title, meta);
  row.append(text);

  void ensureMusicDetail(id).then(
    (track) => {
      const cover = document.createElement('img');
      cover.className = 'gf-live-music-cover';
      cover.src = track.coverAsset?.deliveryUrl ?? track.cover;
      cover.alt = '';
      cover.draggable = false;
      row.prepend(cover);

      title.textContent = track.title;
      meta.textContent = [
        track.artist || '未知艺术家',
        track.album || '未知专辑',
        formatDuration(track.seconds),
      ].join(' · ');
    },
    (error: unknown) => {
      row.dataset.state = 'error';
      meta.textContent = isApiRequestError(error, 'NOT_FOUND')
        ? '音乐库里已没有这首，读者会看到“曲目已不可用”'
        : '读取失败，请稍后重试';
    },
  );

  return row;
};

const renderAction = (label: string, title: string, run: () => void) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gf-live-music-act';
  button.textContent = label;
  button.title = title;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    run();
  });
  return button;
};

class MusicDirectiveWidget extends WidgetType {
  constructor(private readonly ids: readonly number[]) {
    super();
  }

  eq(other: MusicDirectiveWidget) {
    return (
      other.ids.length === this.ids.length &&
      other.ids.every((id, index) => id === this.ids[index])
    );
  }

  get estimatedHeight() {
    return this.ids.length * ROW_HEIGHT + 14;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('div');
    wrap.className = 'gf-live-music';

    const list = document.createElement('div');
    list.className = 'gf-live-music-list';
    list.append(...this.ids.map(renderRow));

    const bar = document.createElement('div');
    bar.className = 'gf-live-music-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '音乐操作');
    bar.append(
      renderAction('更换', '更换曲目', () =>
        musicActions.current?.change(view.posAtDOM(wrap)),
      ),
      renderAction('删除', '删除这段音乐', () =>
        removeMusicDirective(view, view.posAtDOM(wrap)),
      ),
    );

    wrap.append(list, bar);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

const buildMusicDecorations = (state: EditorState) =>
  Decoration.set(
    musicDirectivesIn(state).map(({ from, to, ids }) =>
      Decoration.replace({
        block: true,
        widget: new MusicDirectiveWidget(ids),
      }).range(from, to),
    ),
  );

const musicDirectiveField = StateField.define<DecorationSet>({
  create: buildMusicDecorations,
  update: (decorations, transaction) =>
    transaction.docChanged ||
    syntaxTree(transaction.state) !== syntaxTree(transaction.startState)
      ? buildMusicDecorations(transaction.state)
      : decorations,
  provide: (field) => EditorView.decorations.from(field),
});

export const musicDirectiveExtension = [
  musicDirectiveField,
  EditorView.atomicRanges.of((view) => view.state.field(musicDirectiveField)),
];
