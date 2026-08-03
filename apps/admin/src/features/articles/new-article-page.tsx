import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from 'react-aria-components';

import { apiClient } from '../../app/api/index.js';
import { articleErrorMessage } from './display.js';

const SLUG_PATTERN = /^\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function NewArticlePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => {
    if (!title.trim()) return '';
    // 本地只是一份可读提示；真正转写由服务端以 pinyin 完成
    return `/articles/${title
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')}`;
  }, [title]);

  const targetSlug = slug.trim() ? slug : suggestedSlug;

  async function handleCreate() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('标题不能为空。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const article = await apiClient.articles.create({
        title: trimmedTitle,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        content: '',
        tags: [],
      });
      await navigate({
        to: '/articles/$articleId',
        params: { articleId: String(article.id) },
      });
    } catch (createError) {
      setError(articleErrorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-5">
      <header className="flex items-center gap-3">
        <Button
          aria-label="返回文章列表"
          className="
            grid size-10 shrink-0 place-items-center rounded-control
            text-ink-faint
            hover:bg-accent
          "
          onPress={() => void navigate({ to: '/articles' })}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <h1 className="text-[1.3rem] font-medium text-ink-strong">新建文章</h1>
      </header>

      <div
        className="
          mt-6 grid gap-4 rounded-panel border border-edge bg-surface p-5
        "
      >
        <div className="grid gap-1.5">
          <span className="font-mono text-[0.72rem] text-ink-faint">
            标题 *
          </span>
          <input
            aria-label="文章标题"
            className="
              min-h-11 w-full rounded-control border border-input-edge bg-input
              px-3 text-base text-primary-ink outline-none
              placeholder:text-input-placeholder
              hover:border-input-hover-edge
              focus-visible:border-focus focus-visible:ring-[3px]
              focus-visible:ring-focus-ring
            "
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            placeholder="输入标题，如：从零实现 Vue 响应系统"
            value={title}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="font-mono text-[0.72rem] text-ink-faint">
            路径（可留空，由标题自动转写）
          </span>
          <input
            aria-label="文章 slug"
            className="
              min-h-11 w-full rounded-control border border-input-edge bg-input
              px-3 font-mono text-[0.9rem] text-primary-ink outline-none
              placeholder:text-input-placeholder
              hover:border-input-hover-edge
              focus-visible:border-focus focus-visible:ring-[3px]
              focus-visible:ring-focus-ring
            "
            onChange={(event) => {
              setSlug(event.target.value.replace(/^\//, ''));
              setError(null);
            }}
            placeholder={suggestedSlug || '/articles/my-article'}
            value={slug}
          />
          <p className="text-[0.74rem] text-ink-muted">
            仅支持小写字母、数字与连字符。保存时冲突会给出建议后缀。
          </p>
        </div>

        <div className="grid gap-1.5">
          <span className="font-mono text-[0.72rem] text-ink-faint">简介</span>
          <input
            aria-label="文章简介"
            className="
              min-h-11 w-full rounded-control border border-input-edge bg-input
              px-3 text-[0.95rem] text-primary-ink outline-none
              placeholder:text-input-placeholder
              hover:border-input-hover-edge
              focus-visible:border-focus focus-visible:ring-[3px]
              focus-visible:ring-focus-ring
            "
            onChange={(event) => setDescription(event.target.value)}
            placeholder="一句话介绍这篇文章"
            value={description}
          />
        </div>

        {error ? (
          <p
            className="
              border-l-[3px] border-l-danger-edge bg-danger-soft px-3 py-2
              text-[0.84rem] text-danger-ink
            "
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            className="
              min-h-11 rounded-control border border-transparent bg-primary px-5
              font-mono text-[0.84rem] text-on-primary
              hover:bg-primary-deep
              focus-visible:outline-[3px] focus-visible:outline-offset-2
              focus-visible:outline-focus-outline
            "
            isDisabled={submitting}
            onPress={() => void handleCreate()}
          >
            {submitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {submitting ? '正在创建' : '创建草稿并编辑'}
          </Button>
        </div>

        {!SLUG_PATTERN.test(targetSlug) && slug.trim() ? (
          <p className="text-[0.74rem] text-danger-ink">路径格式不合法。</p>
        ) : null}
      </div>
    </div>
  );
}
