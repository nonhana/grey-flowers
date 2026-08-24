import type { EditorView } from '@codemirror/view';

import { cn } from 'cnfast';
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Table2,
} from 'lucide-react';

import { IconButton } from '@/ui/button.js';

import {
  insertInline,
  lineWrappedMarkdown,
  prefixLine,
  wrapSelection,
} from './markdown-ops.js';

const TOOLBAR_BUTTONS = [
  {
    icon: Heading2,
    label: '二级标题',
    run: (v: EditorView) => prefixLine(v, '## '),
  },
  {
    icon: Heading3,
    label: '三级标题',
    run: (v: EditorView) => prefixLine(v, '### '),
  },
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
  {
    icon: Table2,
    label: '表格',
    run: (v: EditorView) =>
      insertInline(v, '| 列1 | 列2 |\n| --- | --- |\n|  |  |\n'),
  },
] as const;

export const EditorToolbar = ({
  keyboardInset,
  onOpenPicker,
  onRun,
}: {
  keyboardInset: number;
  onOpenPicker: () => void;
  onRun: (run: (view: EditorView) => void) => void;
}) => (
  /*
   桌面端是顶栏，移动端吸底并跟随软键盘上移——打字时拇指够不到顶栏等于没有。
  */
  <div
    aria-label="Markdown 插入工具"
    className={cn(
      'z-30 gf-scroll-x flex items-center gap-0.5 bg-case px-1.5',
      // 字盘压在纸上的那道边用投影而不是描边：纸是抬升面，不该被线切开。
      'fixed inset-x-0 bottom-0 py-1.5 shadow-case-up',
      'pb-[max(0.375rem,env(safe-area-inset-bottom))]',
      'md:relative md:pb-1.5 md:shadow-case-down',
    )}
    role="toolbar"
    style={
      keyboardInset > 0
        ? { transform: `translateY(-${String(keyboardInset)}px)` }
        : undefined
    }
  >
    {TOOLBAR_BUTTONS.map((button) => (
      <IconButton
        key={button.label}
        label={button.label}
        onPress={() => onRun(button.run)}
        size="md"
      >
        <button.icon aria-hidden />
      </IconButton>
    ))}
    <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-rule" />
    <IconButton label="从资产库插入图片" onPress={onOpenPicker} size="md">
      <ImagePlus aria-hidden />
    </IconButton>
  </div>
);
