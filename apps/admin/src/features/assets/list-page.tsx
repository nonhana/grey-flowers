import type {
  AssetListData,
  AssetListQuery,
  AssetMediaType,
  AssetStatus,
} from '@grey-flowers/contracts';

import { useQuery } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from 'cn';
import { CloudOff, FolderOpen, Music2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { assetsListOptions } from '@/app/server-state/modules/assets';
import { usePageClamp } from '@/hooks/use-page-clamp';
import { useScrollReset } from '@/hooks/use-scroll-reset';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { formatBytes, formatDateTime } from '@/lib/format';
import { Button } from '@/ui/button';
import { EmptyState, Skeleton, StatusReadout } from '@/ui/feedback';
import { SelectField } from '@/ui/form';
import { AssetImage } from '@/ui/image';
import { Paginator } from '@/ui/paginator';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface';

import { mediaTypeLabels, statusLabels } from './display';
import { UploadDialog } from './upload-dialog';

const PAGE_SIZE = 12;
type AssetFilterStatus = 'AVAILABLE' | 'PENDING_CLEANUP';
const STATUS_OPTIONS: AssetFilterStatus[] = ['AVAILABLE', 'PENDING_CLEANUP'];
const MEDIA_OPTIONS: AssetMediaType[] = ['IMAGE', 'AUDIO'];

const statusTone = (status: AssetStatus) =>
  status === 'AVAILABLE' ? 'ok' : status === 'PENDING_CLEANUP' ? 'warn' : 'err';

const AssetCard = ({ asset }: { asset: AssetListData['items'][number] }) => (
  <Link
    className="
      group flex h-full flex-col overflow-hidden rounded-panel border
      border-rule bg-case-raised transition-colors
      hover:border-accent-rule
    "
    params={{ assetId: String(asset.id) }}
    to="/assets/$assetId"
  >
    <div
      className="
        relative grid min-h-28 flex-1 place-items-center overflow-hidden
        border-b border-rule bg-well
      "
    >
      {asset.mediaType === 'AUDIO' ? (
        <Music2 aria-hidden className="size-7 text-ink-dim" />
      ) : (
        <AssetImage
          alt=""
          className="absolute inset-0 size-full object-cover"
          src={asset.deliveryUrl}
        />
      )}
    </div>
    <div className="grid gap-1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="
            truncate text-base text-ink-strong
            group-hover:text-accent-text
          "
        >
          {mediaTypeLabels[asset.mediaType]}
        </span>
        <StatusReadout
          label={statusLabels[asset.status]}
          tone={statusTone(asset.status)}
        />
      </div>
      <MetaLine>
        <span>{formatBytes(asset.byteSize)}</span>
        <span className="ml-auto">{formatDateTime(asset.createdAt)}</span>
      </MetaLine>
    </div>
  </Link>
);

const GRID_CLASS =
  'grid h-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] auto-rows-[minmax(min-content,1fr)] gap-3';

const AssetCardSkeleton = () => (
  <div
    aria-hidden
    className="
      flex h-full flex-col overflow-hidden rounded-panel border border-rule
      bg-case-raised
    "
  >
    <Skeleton className="min-h-28 w-full flex-1 rounded-none" />
    <div className="grid gap-1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-[1.55em] w-1/2 text-base" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <MetaLine>
        <Skeleton className="h-[1.45em] w-16 text-2xs" />
        <Skeleton className="h-[1.45em] w-14 text-2xs" />
        <Skeleton className="ml-auto h-[1.45em] w-24 text-2xs" />
      </MetaLine>
    </div>
  </div>
);

export const AssetsListPage = () => {
  const search = useSearch({ from: '/assets/' });
  const page = search.page ?? 1;
  const listRef = useRef<HTMLElement>(null);
  useScrollReset(listRef, [page, search.status, search.mediaType]);

  const navigateSearch = useSearchNavigation('/assets', search);

  const [uploadOpen, setUploadOpen] = useState(false);

  // 空筛选不进 key：undefined 字段按「未提供」归一
  const listQuery: AssetListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(search.status ? { status: search.status } : {}),
    ...(search.mediaType ? { mediaType: search.mediaType } : {}),
  };
  const assetsQuery = useQuery(assetsListOptions(listQuery));
  const data = assetsQuery.data;
  const loading = assetsQuery.isPending;
  const busy = assetsQuery.isFetching;
  const placeholder = assetsQuery.isPlaceholderData;
  const error = assetsQuery.error;

  const { totalPages } = usePageClamp({
    emptyPage: data !== undefined && data.items.length === 0,
    page,
    pageSize: PAGE_SIZE,
    setPage: (next) => navigateSearch({ page: next }, true),
    total: data?.total ?? 0,
  });
  const hasFilter =
    search.status !== undefined || search.mediaType !== undefined;

  const clearFilters = () =>
    navigateSearch(
      {
        page: undefined,
        status: undefined,
        mediaType: undefined,
      },
      true,
    );

  return (
    <PageBody scroll="child" width="wide">
      <PageHeader
        actions={
          <Button
            icon={<Upload aria-hidden />}
            onPress={() => setUploadOpen(true)}
            tone="solid"
          >
            上传资产
          </Button>
        }
        description="文章封面、正文插图、音源都存在这里，删除前必须零引用。"
        title="资产库"
      />

      <div
        className="
          mt-5 grid grid-cols-2 gap-2
          sm:flex sm:flex-wrap sm:items-center
        "
      >
        <SelectField<AssetMediaType>
          className="sm:w-32"
          hideLabel
          label="类型"
          onChange={(value) =>
            navigateSearch({ page: undefined, mediaType: value })
          }
          optionLabels={mediaTypeLabels}
          options={MEDIA_OPTIONS}
          placeholderLabel="全部类型"
          value={search.mediaType}
        />
        <SelectField<AssetFilterStatus>
          className="sm:w-32"
          hideLabel
          label="状态"
          onChange={(value) =>
            navigateSearch({ page: undefined, status: value })
          }
          optionLabels={statusLabels}
          options={STATUS_OPTIONS}
          placeholderLabel="全部状态"
          value={search.status}
        />
        {hasFilter ? (
          <Button
            icon={<X aria-hidden />}
            onPress={clearFilters}
            size="lg"
            tone="ghost"
          >
            清除
          </Button>
        ) : null}
      </div>

      <section
        aria-busy={busy}
        inert={placeholder}
        ref={listRef}
        className={cn(
          `
            mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain
            transition-opacity
          `,
          placeholder && 'opacity-60',
        )}
      >
        {loading ? (
          <div className={cn(GRID_CLASS, 'animate-content-in')} key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <AssetCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => void assetsQuery.refetch()}>重试</Button>
            }
            icon={<CloudOff aria-hidden />}
            title="没能连上资产库"
          >
            无法加载资产库，请稍后重试。
          </EmptyState>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            action={
              hasFilter ? (
                <Button onPress={clearFilters}>清除筛选</Button>
              ) : (
                <Button
                  icon={<Upload aria-hidden />}
                  onPress={() => setUploadOpen(true)}
                  tone="solid"
                >
                  上传第一个资产
                </Button>
              )
            }
            icon={<FolderOpen aria-hidden />}
            title={hasFilter ? '没有符合这组筛选的资产' : '资产库是空的'}
          >
            {hasFilter
              ? '换一组条件，或者清除筛选看看全部。'
              : '在编辑文章时直接粘贴或拖入图片也会自动上传到这里，不必先来这一页。'}
          </EmptyState>
        ) : (
          <div className={cn(GRID_CLASS, 'animate-content-in')} key="content">
            {data?.items.map((asset) => (
              <AssetCard asset={asset} key={asset.id} />
            ))}
          </div>
        )}
      </section>

      {data ? (
        <Paginator
          className="mt-5"
          isBusy={placeholder}
          onChange={(next) =>
            navigateSearch({ page: next > 1 ? next : undefined })
          }
          page={page}
          total={data.total}
          totalPages={totalPages}
          unit="项"
        />
      ) : null}

      <UploadDialog
        onUploaded={() => {
          clearFilters();
        }}
        open={uploadOpen}
        setOpen={setUploadOpen}
      />
    </PageBody>
  );
};
