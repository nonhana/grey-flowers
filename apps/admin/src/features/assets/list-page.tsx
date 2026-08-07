import type {
  AssetListData,
  AssetMediaType,
  AssetPurpose,
  AssetStatus,
} from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { CloudOff, FolderOpen, Music2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
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
  purposeLabels,
  purposeOptions,
  statusLabels,
} from './display.js';
import { UploadDialog } from './upload-dialog.js';

const PAGE_SIZE = 12;
const STATUS_OPTIONS: AssetStatus[] = ['AVAILABLE', 'PENDING_CLEANUP'];
const MEDIA_OPTIONS: AssetMediaType[] = ['IMAGE', 'AUDIO'];

interface FilterState {
  mediaType?: AssetMediaType;
  purpose?: AssetPurpose;
  status?: AssetStatus;
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
      group grid content-start overflow-hidden rounded-panel border border-rule
      bg-case-raised transition-colors
      hover:border-accent-rule
    "
    params={{ assetId: String(asset.id) }}
    to="/assets/$assetId"
  >
    <div
      className="
        grid h-28 place-items-center overflow-hidden border-b border-rule
        bg-well
      "
    >
      {asset.mediaType === 'AUDIO' ? (
        <Music2 aria-hidden="true" className="size-7 text-ink-dim" />
      ) : (
        <AssetImage
          alt=""
          className="size-full object-cover"
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

/* 只剩一两个资产时也不该出现一块 500px 宽的巨砖：轨道宽度固定，缺的补空位。 */
const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3';

const CardSkeleton = () => (
  <div
    className="
      grid overflow-hidden rounded-panel border border-rule bg-case-raised
    "
  >
    <Skeleton className="h-28 w-full rounded-none" />
    <div className="grid gap-2 px-3 py-2.5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const AssetsListPage = () => {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<AssetListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${JSON.stringify(filters)}|${String(page)}|${String(reloadKey)}`;
  const [prevRequestKey, setPrevRequestKey] = useState(requestKey);
  if (prevRequestKey !== requestKey) {
    setPrevRequestKey(requestKey);
    setLoading(true);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;

    apiClient.assets
      .list({ page, pageSize: PAGE_SIZE, ...filters })
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
  }, [filters, page, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilter = Object.values(filters).some((value) => value !== undefined);

  const applyFilter = (next: FilterState) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
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
        <SelectField<AssetStatus>
          className="sm:w-32"
          hideLabel
          label="状态"
          onChange={(value) => applyFilter({ status: value })}
          optionLabels={statusLabels}
          options={STATUS_OPTIONS}
          placeholderLabel="全部状态"
          value={filters.status}
        />
        {hasFilter ? (
          <Button
            icon={<X aria-hidden="true" />}
            onPress={() => {
              setFilters(EMPTY_FILTER);
              setPage(1);
            }}
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
          <div className={GRID_CLASS}>
            {Array.from({ length: 6 }, (_, index) => (
              <CardSkeleton key={index} />
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
                <Button
                  onPress={() => {
                    setFilters(EMPTY_FILTER);
                    setPage(1);
                  }}
                >
                  清除筛选
                </Button>
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
          <div className={GRID_CLASS}>
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
          setFilters(EMPTY_FILTER);
          setPage(1);
          setReloadKey((current) => current + 1);
        }}
        open={uploadOpen}
        setOpen={setUploadOpen}
      />
    </PageBody>
  );
};
