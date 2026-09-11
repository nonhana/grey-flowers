import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Prec } from '@codemirror/state';
import { EditorView as View, keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import {
  Bold,
  Code2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  lineWrappedMarkdown,
  prefixLine,
  wrapSelection,
} from '@/features/articles/editor/markdown-ops';
import { paperHighlight } from '@/features/articles/editor/paper-highlight';
import { paperTheme } from '@/features/articles/editor/paper-theme';
import { IconButton } from '@/ui/button';

// 动态正文是受限 Markdown 子集（schema 拒标题/HTML/图片/表格），工具条只放白名单内
const FORMAT_ACTIONS = [
  {
    icon: Bold,
    label: '加粗',
    run: (v: EditorView) => wrapSelection(v, '**', '**'),
  },
  {
    icon: Italic,
    label: '斜体',
    run: (v: EditorView) => wrapSelection(v, '*', '*'),
  },
  {
    icon: Link2,
    label: '链接',
    run: (v: EditorView) => wrapSelection(v, '[', '](https://)'),
  },
  {
    icon: List,
    label: '无序列表',
    run: (v: EditorView) => prefixLine(v, '- '),
  },
  {
    icon: ListOrdered,
    label: '有序列表',
    run: (v: EditorView) => prefixLine(v, '1. '),
  },
  { icon: Quote, label: '引用', run: (v: EditorView) => prefixLine(v, '> ') },
  {
    icon: Code2,
    label: '代码块',
    run: (v: EditorView) => lineWrappedMarkdown(v, '```ts', '```'),
  },
] as const;

const activityPaperOverrides = View.theme({
  '.cm-content': { paddingBottom: '1.5rem' },
});

const activitySubmit: { current: () => void } = { current: () => undefined };

export const ActivityEditor = ({
  onChange,
  onSubmit,
  value,
}: {
  onChange: (value: string) => void;
  onSubmit: () => void;
  value: string;
}) => {
  const viewRef = useRef<EditorView | null>(null);

  // Cmd/Ctrl+Enter 的模块级发布槽位经事件路径更新：不在渲染期写入；该 effect 属「CodeMirror action registration」白名单项
  useEffect(() => {
    activitySubmit.current = onSubmit;
  });

  // 扩展只在挂载时构建一次：extensions 引用变化会整体 reconfigure，逐键重建让每次键入都付这笔开销；交互出口走模块级 activitySubmit 槽位
  const [extensions] = useState<Extension[]>(() => [
    View.lineWrapping,
    history(),
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(paperHighlight, { fallback: true }),
    // Cmd/Ctrl+Enter 发布在 DOM 层高优先级拦下：keymap 的 Mod-Enter 在本环境构建产物里对不上号，DOM 层一定能收到且覆盖 Mac/Win 修饰键
    Prec.high(
      View.domEventHandlers({
        keydown(event) {
          if (
            (event.metaKey || event.ctrlKey) &&
            (event.key === 'Enter' || event.key === 'NumpadEnter')
          ) {
            event.preventDefault();
            activitySubmit.current();
            return true;
          }
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === 's'
          ) {
            event.preventDefault();
            return true;
          }
          return false;
        },
      }),
    ),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab,
    ]),
    paperTheme,
    activityPaperOverrides,
  ]);

  const run = (action: (view: EditorView) => void) => {
    const view = viewRef.current;
    if (view) action(view);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-paper">
      <div
        aria-label="Markdown 插入工具"
        className="
          z-30 flex shrink-0 items-center gap-0.5 bg-case p-1.5 shadow-case-down
        "
        role="toolbar"
      >
        {FORMAT_ACTIONS.map((action) => (
          <IconButton
            key={action.label}
            label={action.label}
            onPress={() => run(action.run)}
            size="md"
          >
            <action.icon aria-hidden />
          </IconButton>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-paper">
        <CodeMirror
          basicSetup={false}
          className="h-full text-left"
          extensions={extensions}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          placeholder="分享此刻…"
          theme="none"
          value={value}
        />
      </div>
    </div>
  );
};
