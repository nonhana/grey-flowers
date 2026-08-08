import type {
  AssetListData,
  AssetMediaType,
  AssetPurpose,
  AssetStatus,
} from '@grey-flowers/contracts';

import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { CloudOff, FolderOpen, Music2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { formatBytes, formatDateTime } from '@/lib/format.js';
import {
  AssetImage,
  Button,
  EmptyState,
  MetaLine,
  PageBody,
  PageHeader,
  Paginator,
  SelectField,
  Skeleton,
  StatusReadout,
} from '@/ui/index.js';

import {
  mediaTypeLabels,
  parseAssetStatusFilter,
  purposeLabels,
  purposeOptions,
  statusLabels,
} from './display.js';
import { UploadDialog } from './upload-dialog.js';

const PAGE_SIZE = 12;
/** 状态筛选只在可选的两个状态上取值（DELETED 不参与筛选）。 */
type AssetFilterStatus = 'AVAILABLE' | 'PENDING_CLEANUP';
const STATUS_OPTIONS: AssetFilterStatus[] = ['AVAILABLE', 'PENDING_CLEANUP'];
const MEDIA_OPTIONS: AssetMediaType[] = ['IMAGE', 'AUDIO'];

interface FilterState {
  mediaType?: AssetMediaType;
  purpose?: AssetPurpose;
}

const EMPTY_FILTER: FilterState = {};

const statusTone = (status: AssetStatus) =>
  status === 'AVAILABLE' ? 'ok' : status === 'PENDING_CLEANUP' ? 'warn' : 'err';

/**
 * 缩略图直接顶到卡片内沿 —— 不再是「圆角盒子里再套一个圆角盒子」。
 * 卡片只声明一次抬升：描边，不叠投影。
 */
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
        <Music2 aria-hidden="true" className="size-7 text-ink-dim" />
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
          {purposeLabels[asset.purpose]}
        </span>
        <StatusReadout
          label={statusLabels[asset.status]}
          tone={statusTone(asset.status)}
        />
      </div>
      <MetaLine>
        <span>{mediaTypeLabels[asset.mediaType]}</span>
        <span>{formatBytes(asset.byteSize)}</span>
        <span className="ml-auto">{formatDateTime(asset.createdAt)}</span>
      </MetaLine>
    </div>
  </Link>
);

/* 只剩一两个资产时也不该出现一块 500px 宽的巨砖：轨道宽度固定，缺的补空位。
   网格 h-full 撑满列表区，行高 minmax(min-content,1fr)：内容超过视口时
   行取内容高、列表区照常滚动；视口高时 1fr 均分剩余高度。缩略图绝对定位
   不参与行高计算（否则加载出来的图片会把行撑得参差不齐），由卡片内部的
   缩略图区吸收增长，避免底部留白。 */
const GRID_CLASS =
  'grid h-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] auto-rows-[minmax(min-content,1fr)] gap-3';

/**
 * 与真实资产卡同构的骨架：图区（min-h-28、随行高吸收增长）+ 标签行（含状态
 * 读数位 28px）+ 三段元数据。块高按真实字号的 line-height 取 em，落地时卡高相等。
 */
const AssetCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="
      flex h-full flex-col overflow-hidden rounded-panel border
      border-rule bg-case-raised
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
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { status?: unknown };
  const status = parseAssetStatusFilter(search.status);
  const activeStatus: AssetFilterStatus | undefined =
    status === 'all' ? undefined : status;

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<AssetListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${JSON.stringify(filters)}|${String(activeStatus)}|${String(page)}|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError('');
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.assets
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...filters,
        ...(activeStatus ? { status: activeStatus } : {}),
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载资产库，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey, activeStatus]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilter =
    Object.values(filters).some((value) => value !== undefined) ||
    activeStatus !== undefined;

  const applyFilter = (next: FilterState) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTER);
    setPage(1);
    void navigate({ search: {}, to: '/assets' });
  };

  return (
    <PageBody scroll="child" width="wide">
      <PageHeader
        actions={
          <Button
            icon={<Upload aria-hidden="true" />}
            onPress={() => setUploadOpen(true)}
            tone="solid"
          >
            上传资产
          </Button>
        }
        description="文章封面、正文插图、音源都存在这里，删除前必须零引用。"
        title="资产库"
      />

      {/* 一行字盘式筛选条：空选项自己说清是哪一维（「全部用途」），
          于是三个可见标签可以收掉，整排从三行塌成一行。 */}
      <div
        className="
          mt-5 grid grid-cols-2 gap-2
          sm:flex sm:flex-wrap sm:items-center
        "
      >
        <SelectField<AssetPurpose>
          className="sm:w-40"
          hideLabel
          label="用途"
          onChange={(value) => applyFilter({ purpose: value })}
          optionLabels={purposeLabels}
          options={purposeOptions}
          placeholderLabel="全部用途"
          value={filters.purpose}
        />
        <SelectField<AssetMediaType>
          className="sm:w-32"
          hideLabel
          label="类型"
          onChange={(value) => applyFilter({ mediaType: value })}
          optionLabels={mediaTypeLabels}
          options={MEDIA_OPTIONS}
          placeholderLabel="全部类型"
          value={filters.mediaType}
        />
        <SelectField<AssetFilterStatus>
          className="sm:w-32"
          hideLabel
          label="状态"
          onChange={(value) => {
            setPage(1);
            void navigate({
              search: value ? { status: value } : {},
              to: '/assets',
            });
          }}
          optionLabels={statusLabels}
          options={STATUS_OPTIONS}
          placeholderLabel="全部状态"
          value={activeStatus}
        />
        {hasFilter ? (
          <Button
            icon={<X aria-hidden="true" />}
            onPress={clearFilters}
            size="lg"
            tone="ghost"
          >
            清除
          </Button>
        ) : null}
      </div>

      <section
        aria-busy={loading}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
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
              <Button onPress={() => setReloadKey((current) => current + 1)}>
                重试
              </Button>
            }
            icon={<CloudOff aria-hidden="true" />}
            title="没能连上资产库"
          >
            {error}
          </EmptyState>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            action={
              hasFilter ? (
                <Button onPress={clearFilters}>清除筛选</Button>
              ) : (
                <Button
                  icon={<Upload aria-hidden="true" />}
                  onPress={() => setUploadOpen(true)}
                  tone="solid"
                >
                  上传第一个资产
                </Button>
              )
            }
            icon={<FolderOpen aria-hidden="true" />}
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
          onChange={setPage}
          page={page}
          total={data.total}
          totalPages={totalPages}
          unit="项"
        />
      ) : null}

      <UploadDialog
        onUploaded={() => {
          clearFilters();
          setReloadKey((current) => current + 1);
        }}
        open={uploadOpen}
        setOpen={setUploadOpen}
      />
    </PageBody>
  );
};
