import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * 克制的语法着色：标题靠字号和字重，强调靠字重和字形，
 * 只有链接和列表符号动用强调蓝。没有第二个色系。
 */
export const paperHighlight = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: 'var(--color-ink-strong)',
    fontSize: '1.4em',
    fontWeight: '700',
  },
  {
    tag: tags.heading2,
    color: 'var(--color-ink-strong)',
    fontSize: '1.22em',
    fontWeight: '700',
  },
  {
    tag: tags.heading3,
    color: 'var(--color-ink-strong)',
    fontSize: '1.1em',
    fontWeight: '700',
  },
  {
    tag: [tags.heading4, tags.heading5, tags.heading6],
    color: 'var(--color-ink-strong)',
    fontWeight: '700',
  },
  { tag: tags.strong, color: 'var(--color-ink-strong)', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  {
    tag: tags.strikethrough,
    color: 'var(--color-ink-dim)',
    textDecoration: 'line-through',
  },
  { tag: [tags.link, tags.url], color: 'var(--color-accent-text)' },
  { tag: tags.quote, color: 'var(--color-ink-dim)', fontStyle: 'italic' },
  {
    tag: tags.monospace,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
  },
  { tag: tags.list, color: 'var(--color-accent-text)' },
  { tag: tags.contentSeparator, color: 'var(--color-ink-dim)' },
  // Markdown 的 # ** ` 这些记号本身，压到最淡，让内容浮出来。
  { tag: tags.processingInstruction, color: 'var(--color-ink-dim)' },
]);
