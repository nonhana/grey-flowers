import type { SyntaxNode } from '@lezer/common';

import { syntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';

/** ⌘/Ctrl + 点击链接在新标签打开。 */
export const linkClickHandler = EditorView.domEventHandlers({
  click: (event, view) => {
    if (!(event.metaKey || event.ctrlKey)) return false;
    if (event.altKey || event.shiftKey) return false;

    const position = view.posAtCoords(event);
    if (position == null) return false;

    let current: SyntaxNode | null = syntaxTree(view.state).resolveInner(
      position,
    );
    while (current && current.name !== 'Link') current = current.parent;
    if (!current) return false;

    const text = view.state.sliceDoc(current.from, current.to);
    const match = /\]\(\s*([^)\s]+)/.exec(text);
    if (!match) return false;

    event.preventDefault();
    window.open(match[1], '_blank', 'noopener');
    return true;
  },
});
