import type { ArticleAdmin, ArticleSaveInput } from '@grey-flowers/contracts';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiNetworkError, ApiRequestError } from '@/app/api/errors.js';
import { articlesKeys } from '@/app/server-state/articles.js';
import { queryClient } from '@/app/server-state/client.js';

import { createArticleEditorStore } from './article-editor.js';

const api = vi.hoisted(() => ({
  detail: vi.fn(),
  publish: vi.fn(),
  requestPreviewToken: vi.fn(),
  save: vi.fn(),
  snapshots: vi.fn(),
  unpublish: vi.fn(),
}));

const idb = vi.hoisted(() => ({
  del: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

vi.mock('idb-keyval', () => idb);
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/lib/toast.js', () => ({ toastError: vi.fn() }));
// 只替换 apiClient，错误判定仍走真实实现（isApiRequestError / isApiNetworkError
// 依赖 instanceof，桩掉就等于把分支测假了）。
vi.mock('@/app/api/index.js', async () => {
  const errors = await import('@/app/api/errors.js');
  return { ...errors, apiClient: { articles: api } };
});

const ARTICLE_ID = 1;

const articleAt = (revision: number, content: string): ArticleAdmin => ({
  id: ARTICLE_ID,
  to: '/articles/demo',
  title: '示例',
  description: null,
  cover: '',
  coverAssetId: null,
  alt: '',
  categoryId: null,
  category: null,
  tags: [],
  published: false,
  publishedAt: '2026-08-08T00:00:00.000Z',
  editedAt: '2026-08-08T00:00:00.000Z',
  wordCount: content.length,
  revision,
  content,
  inlineAssetIds: [],
});

interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason: unknown) => void;
  resolve: (value: T) => void;
}

const defer = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

/**
 * 跨一个宏任务边界，让所有已排队的微任务（promise 回调链）跑完。
 * 0ms 定时器不会触发 autosave 的 1s debounce，测的仍是显式落盘路径。
 */
const flushMicrotasks = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const requestError = (code: 'ARTICLE_STALE') =>
  new ApiRequestError(
    {
      success: false,
      error: { code, message: 'stale' },
      requestId: 'test',
    },
    409,
  );

const savedContentOf = (call: number) =>
  (api.save.mock.calls[call]?.[1] as ArticleSaveInput | undefined)?.content;

/** 建一个已加载完成（phase = saved）的编辑器 store。 */
const createLoadedStore = async () => {
  api.detail.mockResolvedValue(articleAt(1, 'v0'));
  const store = createArticleEditorStore(ARTICLE_ID);
  await store.getState().reload();
  return store;
};

beforeEach(() => {
  // resetAllMocks 而非 clearAllMocks：mockImplementationOnce 的残留队列
  // 会串到下一个用例里，制造假绿。
  vi.resetAllMocks();
  queryClient.clear();
  idb.del.mockResolvedValue(undefined);
  idb.get.mockResolvedValue(undefined);
  idb.set.mockResolvedValue(undefined);
  api.snapshots.mockResolvedValue({ items: [] });
});

describe('article-editor · flushNow 落盘门控', () => {
  it('无改动且无在途保存时直接放行', async () => {
    const store = await createLoadedStore();

    await expect(store.getState().flushNow()).resolves.toBe(true);
    expect(api.save).not.toHaveBeenCalled();
  });

  it('保存在途期间继续敲字，flushNow 必须等到最后一版落盘（回归 §五①）', async () => {
    const store = await createLoadedStore();
    const first = defer<ArticleAdmin>();
    const second = defer<ArticleAdmin>();
    api.save
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    api.publish.mockResolvedValue(articleAt(3, 'v2'));

    // P1：改一版并立刻落盘（模拟 autosave 已发出请求）
    store.getState().updateDraft({ content: 'v1' });
    const flushing = store.getState().flushNow();
    await flushMicrotasks();
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(savedContentOf(0)).toBe('v1');

    // P1 在途期间用户继续改稿，然后立刻点发布
    store.getState().updateDraft({ content: 'v2' });
    const publishing = store.getState().publish();

    // 放行 P1 → 续保存 P2 必须自动接上
    first.resolve(articleAt(2, 'v1'));
    await flushMicrotasks();
    expect(api.save).toHaveBeenCalledTimes(2);
    expect(savedContentOf(1)).toBe('v2');
    // P2 未落定前，发布请求绝不能发出
    expect(api.publish).not.toHaveBeenCalled();

    second.resolve(articleAt(3, 'v2'));
    await expect(flushing).resolves.toBe(true);

    const published = await publishing;
    expect(published).not.toBeNull();
    expect(api.publish).toHaveBeenCalledTimes(1);
    expect(store.getState().dirty).toBe(false);
    expect(store.getState().phase).toBe('saved');
  });

  it('续保存也用最新 revision，不会拿旧版本号打乐观锁', async () => {
    const store = await createLoadedStore();
    const first = defer<ArticleAdmin>();
    api.save
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => Promise.resolve(articleAt(3, 'v2')));

    store.getState().updateDraft({ content: 'v1' });
    const firstFlush = store.getState().flushNow();
    await flushMicrotasks();
    store.getState().updateDraft({ content: 'v2' });
    const secondFlush = store.getState().flushNow();

    first.resolve(articleAt(2, 'v1'));
    await Promise.all([firstFlush, secondFlush]);

    const revisions = api.save.mock.calls.map(
      (call) => (call[1] as ArticleSaveInput).expectedRevision,
    );
    expect(revisions).toStrictEqual([1, 2]);
  });

  it('续保存排队期间 dirty 不会被中途误清', async () => {
    const store = await createLoadedStore();
    const first = defer<ArticleAdmin>();
    const second = defer<ArticleAdmin>();
    api.save
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    store.getState().updateDraft({ content: 'v1' });
    const firstFlush = store.getState().flushNow();
    await flushMicrotasks();
    store.getState().updateDraft({ content: 'v2' });
    const secondFlush = store.getState().flushNow();

    first.resolve(articleAt(2, 'v1'));
    await flushMicrotasks();
    // P1 成功了，但草稿已经是 v2 —— 此刻仍是脏的
    expect(store.getState().dirty).toBe(true);

    second.resolve(articleAt(3, 'v2'));
    await Promise.all([firstFlush, secondFlush]);
    expect(store.getState().dirty).toBe(false);
  });

  it('落盘撞上乐观锁冲突时拒绝发布，且不自旋重试', async () => {
    const store = await createLoadedStore();
    api.save.mockRejectedValue(requestError('ARTICLE_STALE'));
    api.detail.mockResolvedValue(articleAt(9, 'server'));

    store.getState().updateDraft({ content: 'v1' });
    const published = await store.getState().publish();

    expect(published).toBeNull();
    expect(api.publish).not.toHaveBeenCalled();
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(store.getState().phase).toBe('conflict');
    expect(store.getState().conflict?.server.revision).toBe(9);
  });

  it('离线落盘失败时拒绝发布，并把草稿写进本地恢复槽', async () => {
    const store = await createLoadedStore();
    api.save.mockRejectedValue(new ApiNetworkError(new Error('offline')));

    store.getState().updateDraft({ content: 'v1' });
    const published = await store.getState().publish();

    expect(published).toBeNull();
    expect(api.publish).not.toHaveBeenCalled();
    expect(store.getState().phase).toBe('offline');
    expect(idb.set).toHaveBeenCalledTimes(1);
  });

  it('预览链接基于落盘后的文章，不会用落盘前的旧快照', async () => {
    const store = await createLoadedStore();
    api.save.mockResolvedValue({
      ...articleAt(2, 'v1'),
      to: '/articles/new-slug',
    });
    api.requestPreviewToken.mockResolvedValue({ token: 'tk', expiresIn: 900 });

    store.getState().updateDraft({ content: 'v1' });
    const url = await store.getState().requestPreview();

    expect(url).toContain('/articles/new-slug');
    expect(url).toContain('preview=tk');
  });
});

describe('article-editor · 版本恢复', () => {
  it('落盘失败时不恢复版本', async () => {
    const store = await createLoadedStore();
    api.save.mockRejectedValue(new ApiNetworkError(new Error('offline')));

    store.getState().updateDraft({ content: 'v1' });
    await store.getState().restoreVersion({
      id: 1,
      revision: 1,
      title: '旧标题',
      description: null,
      content: '旧正文',
      wordCount: 3,
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    // 只有落盘那一次 save，恢复写入没有发生
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.snapshots).not.toHaveBeenCalled();
  });

  it('落盘成功后按快照内容写回并刷新版本列表', async () => {
    const store = await createLoadedStore();
    api.save
      .mockResolvedValueOnce(articleAt(2, 'v1'))
      .mockResolvedValueOnce(articleAt(3, '旧正文'));

    store.getState().updateDraft({ content: 'v1' });
    await store.getState().restoreVersion({
      id: 1,
      revision: 1,
      title: '旧标题',
      description: null,
      content: '旧正文',
      wordCount: 3,
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    expect(api.save).toHaveBeenCalledTimes(2);
    const restore = api.save.mock.calls[1]?.[1] as ArticleSaveInput;
    expect(restore.content).toBe('旧正文');
    expect(restore.title).toBe('旧标题');
    expect(restore.createSnapshot).toBe(true);
    expect(restore.expectedRevision).toBe(2);
    expect(api.snapshots).toHaveBeenCalledTimes(1);
  });
});

/**
 * Cache coherence：编辑器写操作成功后必须让 articles 家族缓存过期。
 * 删掉 store 里的 invalidateArticlesAfterMutation() 调用，本用例即红。
 */
describe('article-editor · 缓存一致性', () => {
  it('保存落盘后文章列表缓存被标记失效', async () => {
    const listQuery = { page: 1, pageSize: 20, q: '', status: 'all' } as const;
    queryClient.setQueryData(articlesKeys.list(listQuery), []);
    expect(
      queryClient.getQueryState(articlesKeys.list(listQuery))?.isInvalidated,
    ).toBe(false);

    api.save.mockResolvedValue(articleAt(2, 'v1'));
    const store = await createLoadedStore();
    store.getState().updateDraft({ content: 'v1' });
    await expect(store.getState().flushNow()).resolves.toBe(true);

    expect(
      queryClient.getQueryState(articlesKeys.list(listQuery))?.isInvalidated,
    ).toBe(true);
  });
});
