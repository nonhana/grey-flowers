/**
 * 剥除 Markdown 结构标记得到可见文本：代码块、行内代码、图片、链接、HTML 标签。
 * 图片/链接允许空 href/src（`[^)]*`）。调用方按需叠加符号规则（如剥 `#`、`*`、`|`）。
 */
export const stripMarkdownToPlainText = (markdown: string): string => {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
};
