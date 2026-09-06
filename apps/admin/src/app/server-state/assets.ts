import type { AssetListQuery, AssetPurpose } from '@grey-flowers/contracts';

import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from './client';
import { overviewKeys } from './overview';
import { assetsRoot } from './roots';

/** Picker 每页条数与固定条件一起构成 key 的一部分。 */
export const ASSET_PICKER_PAGE_SIZE = 12;

export const assetsKeys = {
  list: (query: AssetListQuery) => [...assetsRoot, 'list', query] as const,
  detail: (id: number) => [...assetsRoot, 'detail', id] as const,
  picker: (purpose: AssetPurpose, session: number) =>
    [
      ...assetsRoot,
      'picker',
      session,
      { pageSize: ASSET_PICKER_PAGE_SIZE, purpose, status: 'AVAILABLE' },
    ] as const,
};

export const assetsListOptions = (query: AssetListQuery) =>
  queryOptions({
    queryKey: assetsKeys.list(query),
    queryFn: ({ signal }) => apiClient.assets.list(query, signal),
  });

export const assetsDetailOptions = (id: number) =>
  queryOptions({
    queryKey: assetsKeys.detail(id),
    queryFn: ({ signal }) => apiClient.assets.detail(id, signal),
  });

export const assetsPickerOptions = (purpose: AssetPurpose, session: number) =>
  infiniteQueryOptions({
    queryKey: assetsKeys.picker(purpose, session),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiClient.assets.list(
        {
          page: pageParam,
          pageSize: ASSET_PICKER_PAGE_SIZE,
          purpose,
          status: 'AVAILABLE',
        },
        signal,
      ),
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const fetched = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      );
      if (lastPage.items.length === 0 || fetched >= lastPage.total) {
        return undefined;
      }
      return lastPageParam + 1;
    },
  });

/** 资产 upload/status/delete 后的规定失效：assets 全家族 + overview storage。 */
export const invalidateAssetsAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: assetsRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
  ]);
};

/**
 * 上传成功专用：只标记失效、不立即 refetch。
 * 上传回调随后提交新筛选状态，失效标记让「提交后的 key」在下一次
 * observer 恢复时重新请求 —— 避免旧条件 refetch + 新条件 fetch 双请求。
 */
export const markAssetsStale = () => {
  void queryClient.invalidateQueries({
    queryKey: assetsRoot,
    refetchType: 'none',
  });
};
