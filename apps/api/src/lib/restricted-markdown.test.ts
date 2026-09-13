import { describe, expect, it } from 'vitest';

import { createRestrictedMarkdown } from './restricted-markdown';

const commentMd = createRestrictedMarkdown({
  clobberPrefix: 'comment-',
  resourceLabel: '评论',
  keepExcerpt: false,
  validatorKey: 'comment-markdown-validator',
});

const activityMd = createRestrictedMarkdown({
  clobberPrefix: 'activity-',
  resourceLabel: '动态',
  keepExcerpt: true,
  validatorKey: 'activity-markdown-validator',
});

interface AstNode {
  tag?: string;
  props?: Record<string, unknown>;
  children?: AstNode[];
}

/** 收集 MDC body 树上出现的全部标签名。 */
function collectTags(node: AstNode, found = new Set<string>()): Set<string> {
  if (node.tag) found.add(node.tag);
  for (const child of node.children ?? []) collectTags(child, found);
  return found;
}

/** 取第一个匹配标签的节点。 */
function findTag(node: AstNode, tag: string): AstNode | undefined {
  if (node.tag === tag) return node;
  for (const child of node.children ?? []) {
    const hit = findTag(child, tag);
    if (hit) return hit;
  }
  return undefined;
}

describe('createRestrictedMarkdown · 白名单放行', () => {
  it('放行段落/强调/行内代码/链接等白名单标签', async () => {
    const res = await commentMd.parse(
      '**粗体** `x` [链接](https://caelum.moe)',
    );
    expect(res.success).toBe(true);
    if (!res.success || !res.payload) return;

    const tags = collectTags(res.payload.body as AstNode);
    expect([...tags].toSorted()).toStrictEqual(['a', 'code', 'p', 'strong']);
  });

  it('放行代码块与引用/列表结构', async () => {
    const res = await commentMd.parse(
      '> 引用\n\n- 甲\n- 乙\n\n```ts\nconst a = 1\n```',
    );
    expect(res.success).toBe(true);
    if (!res.success || !res.payload) return;

    const tags = collectTags(res.payload.body as AstNode);
    expect(tags.has('blockquote')).toBe(true);
    expect(tags.has('ul')).toBe(true);
    expect(tags.has('li')).toBe(true);
    expect(tags.has('pre')).toBe(true);
  });

  it('外链补齐 target/rel，杜绝 tabnabbing 与权重传递', async () => {
    const res = await commentMd.parse('[链接](https://caelum.moe)');
    expect(res.success).toBe(true);
    if (!res.success || !res.payload) return;

    const anchor = findTag(res.payload.body as AstNode, 'a');
    expect(anchor).toBeDefined();
    expect(anchor?.props?.href).toBe('https://caelum.moe');
    expect(anchor?.props?.target).toBe('_blank');
    expect(anchor?.props?.rel).toStrictEqual([
      'nofollow',
      'noopener',
      'noreferrer',
      'ugc',
    ]);
  });

  it('javascript: 协议链接被消毒掉 href', async () => {
    const res = await commentMd.parse('[戳我](javascript:alert(1))');
    expect(res.success).toBe(true);
    if (!res.success || !res.payload) return;

    const anchor = findTag(res.payload.body as AstNode, 'a');
    // 链接节点留下，但 href 必须被 schema.protocols 整个拦掉（属性消失）。
    expect(anchor).toBeDefined();
    expect(anchor?.props).toStrictEqual({});
  });

  it('activity 保留 excerpt/toc 键，comment 完全不带这两个键', async () => {
    // heading 会被 validator 拒绝，这里用纯文本让两条管道都解析成功，
    // 差异只应体现在 keepExcerpt 决定的 payload 形状上。
    const activity = await activityMd.parse('纯文本正文');
    const comment = await commentMd.parse('纯文本正文');

    expect(activity.success).toBe(true);
    expect(comment.success).toBe(true);
    if (!activity.success || !comment.success) return;

    const activityPayload = activity.payload;
    const commentPayload = comment.payload;
    expect(activityPayload).not.toBeNull();
    expect(commentPayload).not.toBeNull();
    if (!activityPayload || !commentPayload) return;

    // keepExcerpt: true → 键存在（值可为 undefined）；false → 键不存在。
    expect(Object.hasOwn(activityPayload, 'excerpt')).toBe(true);
    expect(Object.hasOwn(activityPayload, 'toc')).toBe(true);
    expect(Object.hasOwn(commentPayload, 'excerpt')).toBe(false);
    expect(Object.hasOwn(commentPayload, 'toc')).toBe(false);
    // 共有字段两侧都在，证明差异确实只来自 keepExcerpt。
    expect(Object.hasOwn(commentPayload, 'body')).toBe(true);
    expect(activityPayload.body).toBeTypeOf('object');
  });
});

describe('createRestrictedMarkdown · 拒绝受限类型', () => {
  it('拒绝 heading', async () => {
    const res = await commentMd.parse('# 一级标题\n\n正文');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.statusCode).toBe(400);
      expect(res.statusMessage).toContain('评论不支持标题');
    }
  });

  it('拒绝原生 HTML', async () => {
    const res = await commentMd.parse('<script>alert(1)</script>');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.statusCode).toBe(400);
      expect(res.statusMessage).toContain('HTML');
    }
  });

  it('拒绝图片', async () => {
    const res = await commentMd.parse('![x](https://cdn.example.com/a.png)');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.statusCode).toBe(400);
      expect(res.statusMessage).toContain('图片');
    }
  });

  it('拒绝表格', async () => {
    const res = await commentMd.parse('| a | b |\n| - | - |');
    expect(res.success).toBe(false);
  });

  it('activity 与 comment 报错资源名不同', async () => {
    const comment = await commentMd.parse('# t');
    const activity = await activityMd.parse('# t');
    if (!comment.success && !activity.success) {
      expect(comment.statusMessage).toContain('评论');
      expect(activity.statusMessage).toContain('动态');
    }
  });
});
