import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import {
  Alert,
  Button,
  IconButton,
  PageBody,
  PageHeader,
  Panel,
  TextField,
} from '@/ui/index.js';

import { articleErrorMessage } from './display.js';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedSlug = slug.trim();
  const slugIsInvalid =
    trimmedSlug.length > 0 && !SLUG_PATTERN.test(trimmedSlug);

  const create = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('标题不能为空。');
      return;
    }
    if (slugIsInvalid) {
      setError('路径只能使用小写字母、数字与连字符。');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const article = await apiClient.articles.create({
        content: '',
        tags: [],
        title: trimmedTitle,
        ...(trimmedSlug ? { slug: trimmedSlug } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast.success('草稿已创建。');
      await navigate({
        params: { articleId: String(article.id) },
        to: '/articles/$articleId',
      });
    } catch (createError) {
      setError(articleErrorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageBody width="narrow">
      <PageHeader
        leading={
          <IconButton
            label="返回文章列表"
            onPress={() => void navigate({ to: '/articles' })}
          >
            <ArrowLeft aria-hidden="true" />
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
