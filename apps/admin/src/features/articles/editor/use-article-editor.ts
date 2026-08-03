import type { ArticleAdmin, ArticleSnapshot } from '@grey-flowers/contracts';

import { debounce } from 'es-toolkit';
import { del, get, set } from 'idb-keyval';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  apiClient,
  isApiNetworkError,
  isApiRequestError,
} from '../../../app/api/index.js';

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

export const useArticleEditor = (articleId: number | null) => {
  const [article, setArticle] = useState<ArticleAdmin | null>(null);
  const [draft, setDraftState] = useState<ArticleDraft | null>(null);
  const [loading, setLoading] = useState(articleId !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhaseState] = useState<SavePhase>('idle');
  const [dirty, setDirtyState] = useState(false);
  const [revision, setRevisionState] = useState(0);
  const [conflict, setConflictState] = useState<ConflictState | null>(null);
  const [restoreCandidate, setRestoreCandidate] =
    useState<RestoreCandidate | null>(null);
  const [versions, setVersions] = useState<ArticleSnapshot[] | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // 可变镜像，供 debounce / 单飞闭包读取最新值。
  const draftRef = useRef<ArticleDraft | null>(draft);
  const dirtyRef = useRef(dirty);
  const phaseRef = useRef<SavePhase>(phase);
  const revisionRef = useRef(revision);
  const articleIdRef = useRef(articleId);
  const savingRef = useRef(false);
  const pendingAgainRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);
  useEffect(() => {
    articleIdRef.current = articleId;
  }, [articleId]);

  const sync = useCallback((value: ArticleAdmin) => {
    setArticle(value);
    setDraftState(toDraft(value));
    draftRef.current = toDraft(value);
    setRevisionState(value.revision);
    revisionRef.current = value.revision;
    setDirtyState(false);
    dirtyRef.current = false;
    setLastError(null);
    setConflictState(null);
  }, []);

  const reload = useCallback(async () => {
    if (articleId === null) return;
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await apiClient.articles.detail(articleId);
      setArticle(loaded);
      setDraftState(toDraft(loaded));
      draftRef.current = toDraft(loaded);
      setRevisionState(loaded.revision);
      revisionRef.current = loaded.revision;
      setDirtyState(false);
      dirtyRef.current = false;
      setPhaseState('saved');
      phaseRef.current = 'saved';
      setConflictState(null);
      setLastError(null);

      const stored = await get<RestoreCandidate>(draftKey(articleId));
      if (stored && stored.savedAt > Date.parse(loaded.editedAt)) {
        setRestoreCandidate(stored);
      } else {
        setRestoreCandidate(null);
      }
    } catch (error) {
      setLoadError(
        isApiNetworkError(error)
          ? '无法连接服务，请稍后重试。'
          : '文章加载失败。',
      );
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persist = useCallback(async () => {
    const id = articleIdRef.current;
    const current = draftRef.current;
    if (id === null || current === null) return;

    if (savingRef.current) {
      pendingAgainRef.current = true;
      return;
    }

    savingRef.current = true;
    setPhaseState('saving');
    phaseRef.current = 'saving';
    try {
      const result = await apiClient.articles.save(id, {
        alt: current.alt,
        categoryId: current.categoryId,
        content: current.content,
        cover: current.cover,
        coverAssetId: current.coverAssetId,
        description: current.description ?? undefined,
        expectedRevision: revisionRef.current,
        tags: current.tags,
        title: current.title,
      });
      setArticle(result);
      setRevisionState(result.revision);
      revisionRef.current = result.revision;
      setDirtyState(false);
      dirtyRef.current = false;
      setPhaseState('saved');
      phaseRef.current = 'saved';
      setLastError(null);
      await del(draftKey(id)).catch(() => undefined);
    } catch (error) {
      if (isApiRequestError(error, 'ARTICLE_STALE')) {
        setPhaseState('conflict');
        phaseRef.current = 'conflict';
        setLastError(null);
        try {
          const server = await apiClient.articles.detail(id);
          setConflictState({ resolution: null, server });
        } catch {
          // 拉取服务端版本失败仍保持冲突态，由用户重试刷新
        }
      } else if (isApiNetworkError(error)) {
        setPhaseState('offline');
        phaseRef.current = 'offline';
        setLastError(null);
        await set(draftKey(id), {
          draft: current,
          savedAt: Date.now(),
        } satisfies RestoreCandidate).catch(() => undefined);
      } else {
        setLastError(
          isApiRequestError(error) ? error.message : '保存失败，请重试。',
        );
        setPhaseState('idle');
        phaseRef.current = 'idle';
      }
    } finally {
      savingRef.current = false;
      if (pendingAgainRef.current) {
        pendingAgainRef.current = false;
        void persist();
      }
    }
  }, []);

  const scheduleSave = useMemo(
    () => debounce(() => void persist(), AUTOSAVE_DELAY_MS),
    [persist],
  );

  const updateDraft = useCallback(
    (patch: Partial<ArticleDraft>) => {
      const current = draftRef.current;
      if (!current) return;
      const next = { ...current, ...patch };
      draftRef.current = next;
      setDraftState(next);
      setDirtyState(true);
      dirtyRef.current = true;
      if (phaseRef.current === 'saved' || phaseRef.current === 'idle') {
        setPhaseState('idle');
        phaseRef.current = 'idle';
      }
      scheduleSave();
    },
    [scheduleSave],
  );

  /** 立刻落盘；成功返回 true，供发布 / 预览等前置门控。 */
  const flushNow = useCallback(async (): Promise<boolean> => {
    const id = articleIdRef.current;
    if (id === null) return false;

    if (!dirtyRef.current) {
      return phaseRef.current === 'saved';
    }
    scheduleSave.cancel();
    try {
      await persist();
    } catch {
      return false;
    }
    return phaseRef.current === 'saved';
  }, [persist, scheduleSave]);

  const applyRestored = useCallback(
    (candidate: RestoreCandidate) => {
      draftRef.current = candidate.draft;
      setDraftState(candidate.draft);
      setDirtyState(true);
      dirtyRef.current = true;
      setRestoreCandidate(null);
      if (articleIdRef.current !== null) {
        void del(draftKey(articleIdRef.current)).catch(() => undefined);
      }
      scheduleSave();
    },
    [scheduleSave],
  );

  const discardRestored = useCallback(async () => {
    const id = articleIdRef.current;
    if (id === null) return;
    setRestoreCandidate(null);
    await del(draftKey(id)).catch(() => undefined);
  }, []);

  const resolveConflict = useCallback(
    async (mode: 'keep-mine' | 'take-server') => {
      const current = draftRef.current;
      const id = articleIdRef.current;
      if (!current || id === null || !conflict) return;

      if (mode === 'keep-mine') {
        try {
          const result = await apiClient.articles.save(id, {
            alt: current.alt,
            categoryId: current.categoryId,
            content: current.content,
            cover: current.cover,
            coverAssetId: current.coverAssetId,
            description: current.description ?? undefined,
            expectedRevision: conflict.server.revision,
            preserveServerSnapshot: true,
            tags: current.tags,
            title: current.title,
          });
          sync(result);
          setPhaseState('saved');
          phaseRef.current = 'saved';
          setConflictState(null);
          await del(draftKey(id)).catch(() => undefined);
        } catch (error) {
          if (isApiRequestError(error, 'ARTICLE_STALE')) {
            try {
              const server = await apiClient.articles.detail(id);
              setConflictState({ resolution: null, server });
              setLastError('服务端在决定期间又发生了变化，请再次选择。');
            } catch {
              // 保持冲突态
            }
          } else if (isApiNetworkError(error)) {
            setPhaseState('offline');
            phaseRef.current = 'offline';
            await set(draftKey(id), {
              draft: current,
              savedAt: Date.now(),
            }).catch(() => undefined);
          } else {
            setLastError('覆盖失败，请重试。');
          }
        }
      } else {
        sync(conflict.server);
        setPhaseState('saved');
        phaseRef.current = 'saved';
        setConflictState(null);
      }
    },
    [conflict, sync],
  );

  const loadVersions = useCallback(async () => {
    const id = articleIdRef.current;
    if (id === null) return;
    const data = await apiClient.articles.snapshots(id);
    setVersions(data.items);
  }, []);

  const restoreVersion = useCallback(
    async (snapshot: ArticleSnapshot) => {
      const id = articleIdRef.current;
      const current = draftRef.current;
      if (id === null || !current) return;

      const saved = await flushNow();
      if (!saved && phaseRef.current !== 'saved') return;

      const result = await apiClient.articles.save(id, {
        alt: current.alt,
        categoryId: current.categoryId,
        content: snapshot.content,
        cover: current.cover,
        coverAssetId: current.coverAssetId,
        createSnapshot: true,
        description: snapshot.description ?? undefined,
        expectedRevision: revisionRef.current,
        tags: current.tags,
        title: snapshot.title,
      });
      sync(result);
      setPhaseState('saved');
      phaseRef.current = 'saved';
      await loadVersions();
    },
    [flushNow, loadVersions, sync],
  );

  const publish = useCallback(async () => {
    const id = articleIdRef.current;
    if (id === null) return null;

    const saved = await flushNow();
    if (!saved) return null;

    const result = await apiClient.articles.publish(id);
    sync(result);
    setPhaseState('saved');
    phaseRef.current = 'saved';
    await loadVersions();
    return result;
  }, [flushNow, loadVersions, sync]);

  const unpublish = useCallback(async () => {
    const id = articleIdRef.current;
    if (id === null) return null;

    const saved = await flushNow();
    if (!saved) return null;

    const result = await apiClient.articles.unpublish(id);
    sync(result);
    setPhaseState('saved');
    phaseRef.current = 'saved';
    await loadVersions();
    return result;
  }, [flushNow, loadVersions, sync]);

  const removeArticle = useCallback(async () => {
    const id = articleIdRef.current;
    if (id === null) return;
    await apiClient.articles.remove(id);
    setArticle(null);
  }, []);

  const requestPreview = useCallback(async (): Promise<string | null> => {
    const id = articleIdRef.current;
    const current = article;
    if (id === null || !current) return null;

    const saved = await flushNow();
    if (!saved) return null;

    const { token } = await apiClient.articles.requestPreviewToken(id);
    const mainOrigin =
      (import.meta.env.VITE_MAIN_ORIGIN as string | undefined) ??
      'http://localhost:2410';
    return `${mainOrigin}${current.to}?preview=${encodeURIComponent(token)}`;
  }, [article, flushNow]);

  const canPublish = article !== null && phase === 'saved' && !dirty;

  return {
    article,
    canPublish,
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
    sync,
    unpublish,
    updateDraft,
  };
};
