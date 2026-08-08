import type {
  ArticleAdmin,
  ArticleSaveInput,
  ArticleSnapshot,
} from '@grey-flowers/contracts';

import { debounce } from 'es-toolkit';
import { del, get as idbGet, set as idbSet } from 'idb-keyval';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import {
  apiClient,
  isApiNetworkError,
  isApiRequestError,
} from '@/app/api/index.js';
import { toastError } from '@/lib/toast.js';

export interface ArticleDraft {
  alt: string;
  category: string | null;
  categoryId: number | null;
  content: string;
  cover: string;
  coverAssetId: number | null;
  description: string | null;
  tags: string[];
  title: string;
}

export type SavePhase = 'idle' | 'saving' | 'saved' | 'offline' | 'conflict';

export interface RestoreCandidate {
  draft: ArticleDraft;
  savedAt: number;
}

export interface ConflictState {
  server: ArticleAdmin;
  /** 是否已在服务端快照旧版本（保留我的未再遇到争用则 true）*/
  resolution: 'keep-mine' | 'take-server' | null;
}

export interface ArticleEditorState {
  article: ArticleAdmin | null;
  draft: ArticleDraft | null;
  loading: boolean;
  loadError: string | null;
  phase: SavePhase;
  dirty: boolean;
  revision: number;
  conflict: ConflictState | null;
  restoreCandidate: RestoreCandidate | null;
  versions: ArticleSnapshot[] | null;
  lastError: string | null;
}

export interface ArticleEditorActions {
  sync: (value: ArticleAdmin) => void;
  reload: () => Promise<void>;
  updateDraft: (patch: Partial<ArticleDraft>) => void;
  flushNow: () => Promise<boolean>;
  applyRestored: (candidate: RestoreCandidate) => void;
  discardRestored: () => Promise<void>;
  resolveConflict: (mode: 'keep-mine' | 'take-server') => Promise<void>;
  /** 冲突时服务端详情拉取失败后的人工重试：重新拉取并进入解析对话框。 */
  retryConflict: () => Promise<void>;
  loadVersions: () => Promise<void>;
  restoreVersion: (snapshot: ArticleSnapshot) => Promise<void>;
  publish: () => Promise<ArticleAdmin | null>;
  unpublish: () => Promise<ArticleAdmin | null>;
  removeArticle: () => Promise<boolean>;
  requestPreview: () => Promise<string | null>;
}

const AUTOSAVE_DELAY_MS = 1000;

const draftKey = (articleId: number) => {
  return `gf.article-draft.${articleId}`;
};

export const toDraft = (article: ArticleAdmin): ArticleDraft => {
  return {
    alt: article.alt,
    category: article.category,
    categoryId: article.categoryId,
    content: article.content,
    cover: article.cover,
    coverAssetId: article.coverAssetId,
    description: article.description,
    tags: article.tags,
    title: article.title,
  };
};

interface SavePayloadOverrides {
  content?: string;
  description?: string;
  expectedRevision: number;
  title?: string;
  createSnapshot?: boolean;
  preserveServerSnapshot?: boolean;
}

/**
 * save payload 单点组装（persist / resolveConflict(keep-mine) / restoreVersion
 * 三处共用）。加字段只改这里，杜绝反射环类漏字段。
 */
const buildSavePayload = (
  draft: ArticleDraft,
  overrides: SavePayloadOverrides,
): ArticleSaveInput => {
  const payload: ArticleSaveInput = {
    alt: draft.alt,
    categoryId: draft.categoryId,
    content: overrides.content ?? draft.content,
    cover: draft.cover,
    coverAssetId: draft.coverAssetId,
    description:
      overrides.description === undefined
        ? (draft.description ?? undefined)
        : overrides.description,
    expectedRevision: overrides.expectedRevision,
    tags: draft.tags,
    title: overrides.title ?? draft.title,
  };

  if (overrides.createSnapshot !== undefined)
    payload.createSnapshot = overrides.createSnapshot;
  if (overrides.preserveServerSnapshot !== undefined)
    payload.preserveServerSnapshot = overrides.preserveServerSnapshot;

  return payload;
};

/** 每个编辑实例一个 store */
export const createArticleEditorStore = (articleId: number | null) => {
  let savingPromise: Promise<void> | null = null;
  let pendingAgain = false;

  return createStore<ArticleEditorState & ArticleEditorActions>()(
    (set, get) => {
      const sync = (value: ArticleAdmin) => {
        set({
          article: value,
          draft: toDraft(value),
          revision: value.revision,
          dirty: false,
          lastError: null,
          conflict: null,
        });
      };

      /**
       * 落盘。已在保存中时记录 pendingAgain 并 **join 在途 promise**（而非直接返回），
       * 让 flushNow 的「发布前先落盘」门控能等到真正落定而不是提前失败。
       */
      const persist = (): Promise<void> => {
        const current = get().draft;
        if (articleId === null || current === null) return Promise.resolve();

        if (savingPromise) {
          pendingAgain = true;
          return savingPromise;
        }

        set({ phase: 'saving' });
        savingPromise = apiClient.articles
          .save(
            articleId,
            buildSavePayload(current, { expectedRevision: get().revision }),
          )
          .then((result) => {
            set({
              article: result,
              revision: result.revision,
              dirty: false,
              phase: 'saved',
              lastError: null,
            });
            return del(draftKey(articleId)).catch(() => undefined);
          })
          .catch(async (error) => {
            if (isApiRequestError(error, 'ARTICLE_STALE')) {
              set({ phase: 'conflict', lastError: null });
              // 拉取服务端版本失败仍保持冲突态，由用户显式 retryConflict 重试。
              try {
                const server = await apiClient.articles.detail(articleId);
                set({ conflict: { resolution: null, server } });
              } catch {
                set({ conflict: null, lastError: '无法加载服务端版本，请重试。' });
              }
            } else if (isApiNetworkError(error)) {
              set({ phase: 'offline', lastError: null });
              await idbSet(draftKey(articleId), {
                draft: current,
                savedAt: Date.now(),
              } satisfies RestoreCandidate).catch(() => undefined);
            } else {
              set({
                lastError: isApiRequestError(error)
                  ? error.message
                  : '保存失败，请重试。',
                phase: 'idle',
              });
            }
          })
          .finally(() => {
            savingPromise = null;
            if (pendingAgain) {
              pendingAgain = false;
              void persist();
            }
          });

        return savingPromise;
      };

      const scheduleSave = debounce(() => void persist(), AUTOSAVE_DELAY_MS);

      const reload = async () => {
        if (articleId === null) return;
        set({ loading: true, loadError: null });
        try {
          const loaded = await apiClient.articles.detail(articleId);
          set({
            article: loaded,
            draft: toDraft(loaded),
            revision: loaded.revision,
            dirty: false,
            phase: 'saved',
            conflict: null,
            lastError: null,
          });

          const stored = await idbGet<RestoreCandidate>(draftKey(articleId));
          if (stored && stored.savedAt > Date.parse(loaded.editedAt)) {
            set({ restoreCandidate: stored });
          } else {
            set({ restoreCandidate: null });
          }
        } catch (error) {
          set({
            loadError: isApiNetworkError(error)
              ? '无法连接服务，请稍后重试。'
              : '文章加载失败。',
          });
        } finally {
          set({ loading: false });
        }
      };

      const updateDraft = (patch: Partial<ArticleDraft>) => {
        const current = get().draft;
        if (!current) return;
        const next = { ...current, ...patch };
        const phase = get().phase;
        set({
          draft: next,
          dirty: true,
          phase: phase === 'saved' || phase === 'idle' ? 'idle' : phase,
        });
        scheduleSave();
      };

      /**
       * 立刻落盘；成功返回 true，供发布 / 预览等前置门控。
       * 保存进行中时 join 在途 promise，等真正落定再判断结果。
       */
      const flushNow = async (): Promise<boolean> => {
        if (articleId === null || get().draft === null) return false;

        if (!get().dirty && !savingPromise) {
          return get().phase === 'saved';
        }
        scheduleSave.cancel();
        await persist();
        return get().phase === 'saved';
      };

      const applyRestored = (candidate: RestoreCandidate) => {
        set({ draft: candidate.draft, dirty: true, restoreCandidate: null });
        if (articleId !== null) {
          void del(draftKey(articleId)).catch(() => undefined);
        }
        scheduleSave();
      };

      const discardRestored = async () => {
        if (articleId === null) return;
        set({ restoreCandidate: null });
        await del(draftKey(articleId)).catch(() => undefined);
      };

      const resolveConflict = async (mode: 'keep-mine' | 'take-server') => {
        const current = get().draft;
        const conflictState = get().conflict;
        if (!current || articleId === null || !conflictState) return;

        if (mode === 'keep-mine') {
          try {
            const result = await apiClient.articles.save(
              articleId,
              buildSavePayload(current, {
                expectedRevision: conflictState.server.revision,
                preserveServerSnapshot: true,
              }),
            );
            sync(result);
            set({ phase: 'saved', conflict: null });
            await del(draftKey(articleId)).catch(() => undefined);
          } catch (error) {
            if (isApiRequestError(error, 'ARTICLE_STALE')) {
              try {
                const server = await apiClient.articles.detail(articleId);
                set({
                  conflict: { resolution: null, server },
                  lastError: '服务端在决定期间又发生了变化，请再次选择。',
                });
              } catch {
                // 保持冲突态
              }
            } else if (isApiNetworkError(error)) {
              set({ phase: 'offline' });
              await idbSet(draftKey(articleId), {
                draft: current,
                savedAt: Date.now(),
              }).catch(() => undefined);
            } else {
              set({ lastError: '覆盖失败，请重试。' });
            }
          }
        } else {
          sync(conflictState.server);
          set({ phase: 'saved', conflict: null });
        }
      };

      /** 冲突时服务端详情拉取失败后的显式重试（保持冲突态，不再死胡同）。 */
      const retryConflict = async () => {
        if (articleId === null) return;
        set({ phase: 'conflict', lastError: null });
        try {
          const server = await apiClient.articles.detail(articleId);
          set({ conflict: { resolution: null, server } });
        } catch (error) {
          set({
            conflict: null,
            lastError: isApiNetworkError(error)
              ? '无法连接服务，请稍后重试。'
              : '无法加载服务端版本，请重试。',
          });
        }
      };

      const loadVersions = async () => {
        if (articleId === null) return;
        const data = await apiClient.articles.snapshots(articleId);
        set({ versions: data.items });
      };

      const restoreVersion = async (snapshot: ArticleSnapshot) => {
        const current = get().draft;
        if (articleId === null || !current) return;

        const saved = await flushNow();
        if (!saved && get().phase !== 'saved') return;

        const result = await apiClient.articles.save(
          articleId,
          buildSavePayload(current, {
            content: snapshot.content,
            createSnapshot: true,
            description: snapshot.description ?? undefined,
            expectedRevision: get().revision,
            title: snapshot.title,
          }),
        );
        sync(result);
        set({ phase: 'saved' });
        await loadVersions();
      };

      const publish = async () => {
        if (articleId === null) return null;

        const saved = await flushNow();
        if (!saved) return null;

        try {
          const result = await apiClient.articles.publish(articleId);
          sync(result);
          set({ phase: 'saved' });
          await loadVersions();
          toast.success('文章已发布。');
          return result;
        } catch (error) {
          toastError(error);
          return null;
        }
      };

      const unpublish = async () => {
        if (articleId === null) return null;

        const saved = await flushNow();
        if (!saved) return null;

        try {
          const result = await apiClient.articles.unpublish(articleId);
          sync(result);
          set({ phase: 'saved' });
          await loadVersions();
          toast.success('文章已下架。');
          return result;
        } catch (error) {
          toastError(error);
          return null;
        }
      };

      const removeArticle = async (): Promise<boolean> => {
        if (articleId === null) return false;

        try {
          await apiClient.articles.remove(articleId);
          set({ article: null });
          toast.success('文章已删除。');
          return true;
        } catch (error) {
          toastError(error);
          return false;
        }
      };

      const requestPreview = async (): Promise<string | null> => {
        const current = get().article;
        if (articleId === null || !current) return null;

        const saved = await flushNow();
        if (!saved) return null;

        const { token } =
          await apiClient.articles.requestPreviewToken(articleId);
        const mainOrigin =
          (import.meta.env.VITE_MAIN_ORIGIN as string | undefined) ??
          'http://localhost:2410';
        return `${mainOrigin}${current.to}?preview=${encodeURIComponent(token)}`;
      };

      return {
        article: null,
        draft: null,
        loading: articleId !== null,
        loadError: null,
        phase: 'idle',
        dirty: false,
        revision: 0,
        conflict: null,
        restoreCandidate: null,
        versions: null,
        lastError: null,
        sync,
        reload,
        updateDraft,
        flushNow,
        applyRestored,
        discardRestored,
        resolveConflict,
        retryConflict,
        loadVersions,
        restoreVersion,
        publish,
        unpublish,
        removeArticle,
        requestPreview,
      };
    },
  );
};

/**
 * 文章编辑器 React 绑定：每实例 store + 逐字段订阅 + 挂载即拉取。
 * 返回形状即编辑器公开 API（workspace-page / inspector-pane 直接消费）。
 */
export const useArticleEditor = (articleId: number | null) => {
  const store = useMemo(() => createArticleEditorStore(articleId), [articleId]);

  const article = useStore(store, (s) => s.article);
  const draft = useStore(store, (s) => s.draft);
  const loading = useStore(store, (s) => s.loading);
  const loadError = useStore(store, (s) => s.loadError);
  const phase = useStore(store, (s) => s.phase);
  const dirty = useStore(store, (s) => s.dirty);
  const revision = useStore(store, (s) => s.revision);
  const conflict = useStore(store, (s) => s.conflict);
  const restoreCandidate = useStore(store, (s) => s.restoreCandidate);
  const versions = useStore(store, (s) => s.versions);
  const lastError = useStore(store, (s) => s.lastError);

  const applyRestored = useStore(store, (s) => s.applyRestored);
  const discardRestored = useStore(store, (s) => s.discardRestored);
  const loadVersions = useStore(store, (s) => s.loadVersions);
  const publish = useStore(store, (s) => s.publish);
  const removeArticle = useStore(store, (s) => s.removeArticle);
  const requestPreview = useStore(store, (s) => s.requestPreview);
  const resolveConflict = useStore(store, (s) => s.resolveConflict);
  const retryConflict = useStore(store, (s) => s.retryConflict);
  const restoreVersion = useStore(store, (s) => s.restoreVersion);
  const sync = useStore(store, (s) => s.sync);
  const unpublish = useStore(store, (s) => s.unpublish);
  const updateDraft = useStore(store, (s) => s.updateDraft);

  // 进入编辑器即拉取一次文章与离线恢复候选。
  useEffect(() => {
    void store.getState().reload();
  }, [store]);

  return {
    article,
    canPublish: article !== null && phase === 'saved' && !dirty,
    conflict,
    dirty,
    draft,
    lastError,
    loadError,
    loading,
    phase,
    restoreCandidate,
    revision,
    versions,
    applyRestored,
    discardRestored,
    loadVersions,
    publish,
    removeArticle,
    requestPreview,
    resolveConflict,
    restoreVersion,
    retryConflict,
    sync,
    unpublish,
    updateDraft,
  };
};
