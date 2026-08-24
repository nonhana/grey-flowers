import { EditorView } from '@codemirror/view';

/**
 * 纸面主题：刻意无行号（行号是代码编辑器的度量）、行宽 68ch、
 * 底部 45vh 留白让末行能滚到视线中央。
 */
export const paperTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-paper)',
    color: 'var(--color-ink)',
    height: '100%',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.9',
    overflowY: 'auto',
  },
  '.cm-content': {
    boxSizing: 'border-box',
    caretColor: 'var(--color-accent)',
    fontSize: '17px',
    marginInline: 'auto',
    maxWidth: '72ch',
    minHeight: '100%',
    overflowWrap: 'break-word',
    padding: '2.25rem 1.25rem 45vh',
    wordBreak: 'break-word',
  },
  '.cm-line': { padding: '0' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-selectionBackground': { background: 'var(--color-accent-wash)' },
  '&.cm-focused .cm-selectionBackground': {
    background: 'var(--color-accent-wash)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--color-accent)',
    borderLeftWidth: '2px',
  },
  '.cm-placeholder': { color: 'var(--color-ink-dim)' },

  /* 所见即所得层：图片、上传幽灵、块级观感、链接 */
  '& .gf-live-img': {
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    position: 'relative',
    margin: '0.2em 0.15em 0.2em 0',
    maxWidth: '100%',
    lineHeight: '0',
  },
  '& .gf-live-img-thumb': {
    display: 'block',
    maxWidth: 'min(100%, 560px)',
    maxHeight: '260px',
    objectFit: 'contain',
    borderRadius: '6px',
    border: '1px solid var(--color-edge)',
    background: 'var(--color-well)',
    cursor: 'zoom-in',
  },
  '& .gf-live-img-bar': {
    position: 'absolute',
    top: '4px',
    right: '4px',
    display: 'flex',
    gap: '4px',
    opacity: '0',
    transition: 'opacity 120ms ease',
    lineHeight: 'normal',
  },
  '& .gf-live-img:hover .gf-live-img-bar': { opacity: '1' },
  '& .gf-live-img-act': {
    minHeight: '28px',
    border: 'none',
    borderRadius: '5px',
    padding: '0 8px',
    background: 'var(--color-case-raised)',
    color: 'var(--color-ink-strong)',
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    lineHeight: '28px',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgb(0 0 0 / 0.18)',
  },
  '& .gf-live-img-act:hover': { background: 'var(--color-accent-wash)' },
  '& .gf-live-ghost': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    verticalAlign: 'middle',
    padding: '5px 8px',
    border: '1px dashed var(--color-edge)',
    borderRadius: '6px',
    background: 'var(--color-well)',
    margin: '0.2em 0.15em',
    lineHeight: 'normal',
  },
  '& .gf-live-ghost-img': {
    width: '96px',
    maxHeight: '64px',
    objectFit: 'cover',
    borderRadius: '4px',
    opacity: '0.7',
  },
  '& .gf-live-ghost-meta': {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8em',
    color: 'var(--color-ink-dim)',
  },
  '& .cm-line.gf-live-bq': {
    borderLeft: '2px solid var(--color-accent-text)',
    paddingLeft: '0.75rem',
    background: 'var(--color-accent-wash)',
    borderRadius: '0 4px 4px 0',
  },
  '& .cm-line.gf-live-table': {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
  },
  '& .cm-line.gf-live-code': {
    background: 'var(--color-well)',
    borderLeft: '2px solid var(--color-edge)',
  },
  '& .gf-live-link': {
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    textDecorationColor:
      'color-mix(in srgb, var(--color-accent-text) 45%, transparent)',
  },
});
