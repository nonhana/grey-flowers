import { stripMarkdownToPlainText } from '@/lib/markdown.js';

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/**
 * Typora「字数」口径：去除 Markdown 标记得到可见文本后，
 * CJK（中日韩统一表意文字）逐字计 1，连续 ASCII 字母/数字串计 1。
 *
 * 阶段 0 印证：存量 51 篇无法由当前 content 精确复现（0/51），
 * 说明存量值为导入期旧口径；本函数作为新写入的规范口径，
 * 存量行保留原值、仅在重新保存时按本口径增量校正（详见切片计划 §十一）。
 */
export const countArticleWordCount = (markdown: string): number => {
  let text = stripMarkdownToPlainText(markdown);
  text = text.replace(/^[#]+\s*/gm, '');
  text = text.replace(/[*_~|]/g, ' ');

  let count = 0;
  let inAsciiWord = false;
  for (const character of text) {
    if (CJK_PATTERN.test(character)) {
      count += 1;
      inAsciiWord = false;
    } else if (/[A-Za-z0-9]/.test(character)) {
      if (!inAsciiWord) {
        count += 1;
        inAsciiWord = true;
      }
    } else {
      inAsciiWord = false;
    }
  }
  return count;
};
