import type { ArticleCreateInput } from '@grey-flowers/contracts';

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import { invalidateArticlesAfterMutation } from '@/app/server-state/articles';
import { Button, IconButton } from '@/ui/button';
import { Alert } from '@/ui/feedback';
import { TextField } from '@/ui/form';
import { PageBody, PageHeader, Panel } from '@/ui/surface';

import { articleErrorMessage } from './display';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const suggestSlug = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export const NewArticlePage = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmedSlug = slug.trim();
  const slugIsInvalid =
    trimmedSlug.length > 0 && !SLUG_PATTERN.test(trimmedSlug);

  const createMutation = useMutation({
    mutationFn: (input: ArticleCreateInput) => apiClient.articles.create(input),
    onSuccess: async (article) => {
      toast.success('草稿已创建。');
      await invalidateArticlesAfterMutation();
      await navigate({
        params: { articleId: String(article.id) },
        to: '/articles/$articleId',
      });
    },
    onError: (createError) => {
      setError(articleErrorMessage(createError));
    },
  });

  const create = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('标题不能为空。');
      return;
    }
    if (slugIsInvalid) {
      setError('路径只能使用小写字母、数字与连字符。');
      return;
    }

    setError(null);
    createMutation.mutate({
      content: '',
      tags: [],
      title: trimmedTitle,
      ...(trimmedSlug ? { slug: trimmedSlug } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  const submitting = createMutation.isPending;

  return (
    <PageBody width="narrow">
      <PageHeader
        leading={
          <IconButton
            label="返回文章列表"
            onPress={() => void navigate({ to: '/articles' })}
          >
            <ArrowLeft aria-hidden />
          </IconButton>
        }
        title="新建文章"
      />

      <Panel className="mt-6 p-5">
        <Form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <TextField
            isRequired
            label="标题"
            onChange={(value) => {
              setTitle(value);
              setError(null);
            }}
            placeholder="从零实现 Vue 响应系统"
            value={title}
          />

          <TextField
            description="留空则按标题自动生成（小写、空格与标点转连字符）。仅支持小写字母、数字与连字符。"
            label="路径"
            onChange={(value) => {
              setSlug(value.replace(/^\/+/, ''));
              setError(null);
            }}
            placeholder={suggestSlug(title) || 'my-article'}
            value={slug}
          />

          <TextField
            description="会显示在列表与主站的文章卡片上。"
            label="简介"
            onChange={setDescription}
            placeholder="一句话介绍这篇文章"
            value={description}
          />

          {error ? <Alert>{error}</Alert> : null}

          <div className="flex justify-end">
            <Button isLoading={submitting} size="lg" tone="solid" type="submit">
              {submitting ? '正在创建' : '创建草稿并编辑'}
            </Button>
          </div>
        </Form>
      </Panel>
    </PageBody>
  );
};
