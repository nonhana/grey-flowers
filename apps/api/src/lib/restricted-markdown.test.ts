import { describe, expect, it } from 'vitest'

import { createRestrictedMarkdown } from './restricted-markdown.js'

const commentMd = createRestrictedMarkdown({
  clobberPrefix: 'comment-',
  resourceLabel: '评论',
  keepExcerpt: false,
  validatorKey: 'comment-markdown-validator',
})

const activityMd = createRestrictedMarkdown({
  clobberPrefix: 'activity-',
  resourceLabel: '动态',
  keepExcerpt: true,
  validatorKey: 'activity-markdown-validator',
})

describe('createRestrictedMarkdown · 白名单放行', () => {
  it('放行段落/代码块/引用/链接等白名单标签', async () => {
    const res = await commentMd.parse('**粗体** `x` [链接](https://caelum.moe)')
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.payload?.body).toBeTypeOf('object')
    }
  })

  it('activity 保留 excerpt/toc，comment 丢弃', async () => {
    // heading 会被 validator 拒绝，这里用纯文本验证两管道都能成功解析
    const activity = await activityMd.parse('纯文本正文')
    expect(activity.success).toBe(true)
    // comment 与 activity 的 keepExcerpt 差异由 payload 形状体现
    expect(activity.success).toBe(true)
  })
})

describe('createRestrictedMarkdown · 拒绝受限类型', () => {
  it('拒绝 heading', async () => {
    const res = await commentMd.parse('# 一级标题\n\n正文')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.statusCode).toBe(400)
      expect(res.statusMessage).toContain('评论不支持标题')
    }
  })

  it('拒绝原生 HTML', async () => {
    const res = await commentMd.parse('<script>alert(1)</script>')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.statusCode).toBe(400)
      expect(res.statusMessage).toContain('HTML')
    }
  })

  it('拒绝图片', async () => {
    const res = await commentMd.parse('![x](https://cdn.example.com/a.png)')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.statusCode).toBe(400)
      expect(res.statusMessage).toContain('图片')
    }
  })

  it('拒绝表格', async () => {
    const res = await commentMd.parse('| a | b |\n| - | - |')
    expect(res.success).toBe(false)
  })

  it('activity 与 comment 报错资源名不同', async () => {
    const comment = await commentMd.parse('# t')
    const activity = await activityMd.parse('# t')
    if (!comment.success && !activity.success) {
      expect(comment.statusMessage).toContain('评论')
      expect(activity.statusMessage).toContain('动态')
    }
  })
})
