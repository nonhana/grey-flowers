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
} from '@/app/api/index';
import {
  invalidateArticlesAfterContentSave,
  invalidateArticlesAfterMutation,
} from '@/app/server-state/modules/articles';
import { markAssetsStale } from '@/app/server-state/modules/assets';
import { toastError } from '@/lib/toast';

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
  /** 冲突时服务端详情拉取失败后的人工重试：重新拉取并进入解析对话框 */
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

/** save payload 单点组装（persist / resolveConflict(keep-mine) / restoreVersion 三处共用），加字段只改这里 */
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

export const createArticleEditorStore = (articleId: number | null) => {
  let savingPromise: Promise<void> | null = null;
  let pendingAgain = false;
  // 防抖句柄前置声明：saveOnce 的冲突分支要 cancel 排队保存，真正的 debounce 在 persist 之后初始化
  let scheduleSave: { (): void; cancel: () => void } | null = null;

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

      /** 单次落盘：成功 true；冲突/离线/服务端报错 false（失败态已写入 store 由 UI 接管），不抛 */
      const saveOnce = async (): Promise<boolean> => {
        const current = get().draft;
        if (articleId === null || current === null) return false;

        set({ phase: 'saving' });
        try {
          const result = await apiClient.articles.save(
            articleId,
            buildSavePayload(current, { expectedRevision: get().revision }),
          );
          set({
            article: result,
            revision: result.revision,
            // 请求在途期间又改了稿（draft 换了引用）就仍是脏的，别让 canPublish/flushNow 在续保存启动前误判已落盘
            dirty: get().draft !== current,
            phase: 'saved',
            lastError: null,
          });
          await del(draftKey(articleId)).catch(() => undefined);
          // 落盘后只让文章列表/元数据缓存过期；计数与发布态不受 save 影响，避免自动保存的 refetch 风暴
          await invalidateArticlesAfterContentSave();
          return true;
        } catch (error) {
          if (isApiRequestError(error, 'ARTICLE_STALE')) {
            // 进入冲突态就掐掉排队的防抖保存：弹窗期间自燃的那次会再撞锁，把刚拉到的 conflict.server 偷换成更旧版本
            scheduleSave?.cancel();
            set({ phase: 'conflict', lastError: null });
            // 拉取服务端版本失败仍保持冲突态，由用户显式 retryConflict 重试
            try {
              const server = await apiClient.articles.detail(articleId);
              set({ conflict: { resolution: null, server } });
            } catch {
              set({
                conflict: null,
                lastError: '无法加载服务端版本，请重试。',
              });
            }
          } else if (isApiNetworkError(error)) {
            set({ phase: 'offline', lastError: null });
          } else {
            set({
              lastError: isApiRequestError(error)
                ? error.message
                : '保存失败，请重试。',
              phase: 'idle',
            });
          }
          // 失败分支统一幂等落恢复槽：存「此刻最新」草稿而非请求开始时的快照，在途输入不丢字；成功路径与 resolveConflict(keep-mine) 成功删槽
          const latest = get().draft ?? current;
          if (latest !== null) {
            await idbSet(draftKey(articleId), {
              draft: latest,
              savedAt: Date.now(),
            } satisfies RestoreCandidate).catch(() => undefined);
          }
          return false;
        }
      };

      /** 串行落盘直到队列真的排空：在途期间的改动记在 pendingAgain，本轮一结束立刻续跑，返回的 promise 才等价「草稿已全部落盘」；失败停失败态不自旋 */
      const drainSaves = async (): Promise<void> => {
        pendingAgain = false;
        const saved = await saveOnce();
        if (saved && pendingAgain) await drainSaves();
      };

      /** 落盘入口：已在保存中时记 pendingAgain 并 join 整条链（而非只等当前这次请求），flushNow 的「发布前已落盘」门控才真正成立 */
      const persist = (): Promise<void> => {
        if (articleId === null || get().draft === null)
          return Promise.resolve();

        if (savingPromise) {
          pendingAgain = true;
          return savingPromise;
        }

        savingPromise = drainSaves().finally(() => {
          savingPromise = null;
          pendingAgain = false;
        });
        return savingPromise;
      };

      scheduleSave = debounce(() => void persist(), AUTOSAVE_DELAY_MS);

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

          // 恢复判定只看内容：槽存在且槽内草稿与当前稿不同才展示恢复条；两边时钟都不可信，内容一致（含无槽）不展示
          const stored = await idbGet<RestoreCandidate>(draftKey(articleId));
          const sameAsLoaded =
            stored !== undefined &&
            JSON.stringify(stored.draft) === JSON.stringify(toDraft(loaded));
          if (stored && !sameAsLoaded) {
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
        scheduleSave?.();
      };

      /** 立刻落盘，成功 true 供发布/预览门控；保存中时 join 整条续保存链等排空再判结果，true 即「此刻 store 草稿已在服务端」 */
      const flushNow = async (): Promise<boolean> => {
        if (articleId === null || get().draft === null) return false;

        scheduleSave?.cancel();
        if (get().dirty || savingPromise !== null) await persist();
        return get().phase === 'saved' && !get().dirty;
      };

      const applyRestored = (candidate: RestoreCandidate) => {
        set({ draft: candidate.draft, dirty: true, restoreCandidate: null });
        if (articleId !== null) {
          void del(draftKey(articleId)).catch(() => undefined);
        }
        scheduleSave?.();
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
          // 采用服务端 = 明确放弃本地稿：冲突分支也落恢复槽，不删槽下次 reload 会把已弃旧稿再端出来
          await del(draftKey(articleId)).catch(() => undefined);
        }
      };

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

      /** 版本列表是次要数据：失败不抛给调用方（主操作不能被误报失败），保留旧列表 + 非阻塞 toast 可随时重试 */
      const loadVersions = async () => {
        if (articleId === null) return;
        try {
          const data = await apiClient.articles.snapshots(articleId);
          set({ versions: data.items });
        } catch {
          toast.error('版本列表加载失败。');
        }
      };

      const restoreVersion = async (snapshot: ArticleSnapshot) => {
        if (articleId === null || get().draft === null) return;

        const saved = await flushNow();
        if (!saved) return;

        // 落盘后重新取草稿：flushNow 期间可能又落了一版，payload 必须基于最新的
        const current = get().draft;
        if (!current) return;

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

        const current = get().draft;
        try {
          const result = await apiClient.articles.publish(articleId);
          // 发布在途又改稿：只同步服务端状态与新 revision，不覆盖草稿不清脏，续保存以新 revision 落盘（沿用 saveOnce 的 dirty 口径）
          if (current !== null && get().draft !== current) {
            set({ article: result, revision: result.revision, phase: 'idle' });
          } else {
            sync(result);
            set({ phase: 'saved' });
          }
          await loadVersions();
          // 发布态变化影响文章列表、taxonomy 计数与 overview 统计
          await invalidateArticlesAfterMutation();
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

        const current = get().draft;
        try {
          const result = await apiClient.articles.unpublish(articleId);
          if (current !== null && get().draft !== current) {
            set({ article: result, revision: result.revision, phase: 'idle' });
          } else {
            sync(result);
            set({ phase: 'saved' });
          }
          await loadVersions();
          await invalidateArticlesAfterMutation();
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
          // 删除级联：列表/计数全失效；被删文章的评论与资产引用投影同步过期
          await invalidateArticlesAfterMutation();
          markAssetsStale();
          toast.success('文章已删除。');
          return true;
        } catch (error) {
          toastError(error);
          return false;
        }
      };

      const requestPreview = async (): Promise<string | null> => {
        if (articleId === null || get().article === null) return null;

        const saved = await flushNow();
        if (!saved) return null;

        // 落盘会换掉 article（新的 to / revision），预览链接取落盘后的那份
        const current = get().article;
        if (!current) return null;

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

/** 返回形状即编辑器公开 API（workspace-page / inspector-pane 直接消费） */
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
  const flushNow = useStore(store, (s) => s.flushNow);
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

  // 关页/刷新前尽力落盘：pagehide 是浏览器卸载页面前最后的事件钩子，同步的外部系统是「页面生命周期 + 服务端草稿」
  useEffect(() => {
    const onPageHide = () => {
      void store.getState().flushNow();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [store]);

  // 离线失败后恢复联网自动续存：把外部网络的恢复转成一次落盘
  useEffect(() => {
    const onOnline = () => {
      const state = store.getState();
      if (state.phase === 'offline') void state.flushNow();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [store]);

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
    flushNow,
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
