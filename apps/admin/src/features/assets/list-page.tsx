import type {
  AssetListData,
  AssetListQuery,
  AssetMediaType,
  AssetPurpose,
  AssetStatus,
} from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { CloudOff, FolderOpen, Music2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Text,
} from 'react-aria-components';

import { apiClient } from '@/app/api/index.js';

import {
  formatBytes,
  formatDateTime,
  mediaTypeLabels,
  purposeLabels,
  purposeOptions,
  statusLabels,
} from './display.js';
import { UploadDialog } from './upload-dialog.js';

interface FilterState {
  mediaType?: AssetMediaType;
  purpose?: AssetPurpose;
  status?: AssetStatus;
}

const EMPTY_FILTER: FilterState = {};

const STATUS_OPTIONS: AssetStatus[] = ['AVAILABLE', 'PENDING_CLEANUP'];

const INPUT_CLASS = `
  min-h-11 rounded-control border border-input-edge bg-input px-3 text-base
  leading-[1.4] text-primary-ink outline-none placeholder:text-input-placeholder
  hover:border-input-hover-edge focus-visible:border-focus
  focus-visible:ring-[3px] focus-visible:ring-focus-ring
  aria-invalid:border-danger-edge
`;

const FilterSelect = <T extends string>({
  label,
  options,
  optionLabels,
  value,
  onChange,
}: {
  label: string;
  optionLabels: Record<string, string>;
  onChange: (value: T | undefined) => void;
  options: readonly T[];
  value: T | undefined;
}) => {
  return (
    <div className="grid min-w-0 gap-1">
      <Label className="font-mono text-[0.7rem] text-ink-soft">{label}</Label>
      <Select
        className="min-w-0"
        onChange={(key) => {
          onChange(key === null || key === 'all' ? undefined : (key as T));
        }}
        value={value ?? 'all'}
      >
        <Button
          className="
            flex min-h-11 w-full items-center justify-between gap-2
            rounded-control border border-input-edge bg-input px-3
            text-[0.88rem] text-ink outline-none
            hover:border-input-hover-edge
            focus-visible:border-focus focus-visible:ring-[3px]
            focus-visible:ring-focus-ring
            [&_svg]:size-4
          "
        >
          <SelectValue className="truncate text-primary-ink" />
          <svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
        <Popover
          className="
            w-52 rounded-control border border-edge bg-surface p-1 shadow-panel
          "
        >
          <ListBox className="outline-none">
            <ListBoxItem
              className="
                cursor-pointer rounded-sm px-3 py-2 text-[0.88rem] text-ink
                outline-none
                data-focused:bg-vapor
                data-selected:bg-vapor data-selected:text-brand-deep
              "
              id="all"
            >
              全部
            </ListBoxItem>
            {options.map((option) => (
              <ListBoxItem
                className="
                  cursor-pointer rounded-sm px-3 py-2 text-[0.88rem] text-ink
                  outline-none
                  data-focused:bg-vapor
                  data-selected:bg-vapor data-selected:text-brand-deep
                "
                id={option}
                key={option}
              >
                {optionLabels[option]}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
};

const StatusBadge = ({ status }: { status: AssetStatus }) => {
  const tone =
    status === 'AVAILABLE'
      ? 'text-brand'
      : status === 'PENDING_CLEANUP'
        ? 'text-warning'
        : 'text-danger';
  return (
    <span
      className={`
        font-mono text-[0.68rem] leading-none
        ${tone}
      `}
    >
      {statusLabels[status]}
    </span>
  );
};

const AssetCard = ({ asset }: { asset: AssetListData['items'][number] }) => {
  const isAudio = asset.mediaType === 'AUDIO';
  return (
    <Link
      className="
        group grid gap-2.5 overflow-hidden rounded-panel border border-edge
        bg-surface p-3.5 transition-colors outline-none
        hover:border-input-hover-edge
        focus-visible:outline-[3px] focus-visible:outline-offset-2
        focus-visible:outline-focus-outline
      "
      params={{ assetId: String(asset.id) }}
      to="/assets/$assetId"
    >
      <div
        className="
          grid h-32 place-items-center overflow-hidden rounded-control border
          border-edge bg-canvas
        "
      >
        {isAudio ? (
          <Music2 aria-hidden="true" className="size-8 text-ink-faint" />
        ) : (
          <img
            alt=""
            className="size-full object-cover"
            loading="lazy"
            src={asset.deliveryUrl}
          />
        )}
      </div>
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[0.9rem] text-ink-strong">
            {purposeLabels[asset.purpose]}
          </span>
          <StatusBadge status={asset.status} />
        </div>
        <p className="font-mono text-[0.72rem] text-ink-faint">
          {mediaTypeLabels[asset.mediaType]} · {formatBytes(asset.byteSize)}
        </p>
        <p className="font-mono text-[0.72rem] text-ink-faint">
          {formatDateTime(asset.createdAt)}
        </p>
      </div>
    </Link>
  );
};

const SkeletonGrid = () => {
  return (
    <div
      className="
        grid grid-cols-1 gap-3
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="
            grid gap-2.5 rounded-panel border border-edge bg-surface p-3.5
          "
          key={index}
        >
          <div className="h-32 animate-pulse rounded-control bg-edge" />
          <div className="h-4 w-2/3 animate-pulse rounded-sm bg-edge" />
          <div className="h-3 w-1/2 animate-pulse rounded-sm bg-edge" />
        </div>
      ))}
    </div>
  );
};

export const AssetsListPage = () => {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<AssetListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const pageSize = 12;

  useEffect(() => {
    let cancelled = false;

    const query: AssetListQuery = { page, pageSize, ...filters };

    apiClient.assets
      .list(query)
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
  }, [filters, page, pageSize, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div
      className="
        mx-auto w-[min(100%-32px,1200px)] py-6
        max-[480px]:w-[min(100%-24px,1200px)]
      "
    >
      <div className="grid gap-5">
        <div className="grid gap-3">
          <p className="font-mono text-[0.7rem] text-ink-faint">
            ASSET LIBRARY
          </p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="m-0 text-[1.6rem] leading-[1.2] text-ink-strong">
              资产库
            </h1>
            <Button
              className="
                flex min-h-10.5 items-center justify-center gap-2
                rounded-control border border-transparent bg-primary px-3.5
                py-2.25 font-mono text-[0.82rem] text-on-primary
                transition-colors outline-none
                hover:bg-primary-deep
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
                [&_svg]:size-4
              "
              onPress={() => setUploadOpen(true)}
            >
              <Upload aria-hidden="true" />
              上传资产
            </Button>
          </div>
        </div>

        <div
          className="
            grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2.5
            max-[640px]:grid-cols-2
          "
        >
          <FilterSelect<AssetPurpose>
            label="用途"
            onChange={(value) => {
              setFilters((current) => ({ ...current, purpose: value }));
              setPage(1);
              setLoading(true);
              setError('');
            }}
            optionLabels={purposeLabels}
            options={purposeOptions}
            value={filters.purpose}
          />
          <FilterSelect<AssetMediaType>
            label="类型"
            onChange={(value) => {
              setFilters((current) => ({ ...current, mediaType: value }));
              setPage(1);
              setLoading(true);
              setError('');
            }}
            optionLabels={mediaTypeLabels}
            options={['IMAGE', 'AUDIO']}
            value={filters.mediaType}
          />
          <FilterSelect<AssetStatus>
            label="状态"
            onChange={(value) => {
              setFilters((current) => ({ ...current, status: value }));
              setPage(1);
              setLoading(true);
              setError('');
            }}
            optionLabels={statusLabels}
            options={STATUS_OPTIONS}
            value={filters.status}
          />
          <Button
            aria-label="清除筛选"
            className="
              flex min-h-11 items-center justify-center gap-1.5 rounded-control
              border border-edge bg-surface px-3 font-mono text-[0.8rem]
              text-ink-muted outline-none
              hover:border-input-hover-edge
              focus-visible:outline-[3px] focus-visible:outline-offset-2
              focus-visible:outline-focus-outline
              [&_svg]:size-4
            "
            isDisabled={
              filters.purpose === undefined &&
              filters.mediaType === undefined &&
              filters.status === undefined
            }
            onPress={() => {
              setFilters(EMPTY_FILTER);
              setPage(1);
              setLoading(true);
              setError('');
            }}
          >
            <X aria-hidden="true" />
            清除
          </Button>
        </div>

        <section aria-busy={loading} aria-live="polite">
          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <div
              className="
                grid gap-3 rounded-panel border border-edge bg-surface p-8
                text-center
              "
            >
              <CloudOff
                aria-hidden="true"
                className="mx-auto size-7 text-ink-faint"
              />
              <p className="m-0 text-ink-muted">{error}</p>
              <Button
                className="
                  mx-auto flex min-h-10.5 items-center justify-center gap-2
                  rounded-control border border-transparent bg-primary px-3.5
                  font-mono text-[0.82rem] text-on-primary outline-none
                  hover:bg-primary-deep
                  focus-visible:outline-[3px] focus-visible:outline-offset-2
                  focus-visible:outline-focus-outline
                "
                onPress={() => setReloadKey((current) => current + 1)}
              >
                重试
              </Button>
            </div>
          ) : data && data.items.length === 0 ? (
            <div
              className="
                grid gap-3 rounded-panel border border-edge bg-surface p-10
                text-center
              "
            >
              <FolderOpen
                aria-hidden="true"
                className="mx-auto size-8 text-ink-faint"
              />
              <p className="m-0 text-ink-muted">还没有符合条件的资产。</p>
              <Button
                className="
                  mx-auto flex min-h-10.5 items-center justify-center gap-2
                  rounded-control border border-transparent bg-primary px-3.5
                  font-mono text-[0.82rem] text-on-primary outline-none
                  hover:bg-primary-deep
                  focus-visible:outline-[3px] focus-visible:outline-offset-2
                  focus-visible:outline-focus-outline
                "
                onPress={() => setUploadOpen(true)}
              >
                <Upload aria-hidden="true" />
                上传第一个资产
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data?.items.map((asset) => (
                <AssetCard asset={asset} key={asset.id} />
              ))}
            </div>
          )}
        </section>

        <nav
          aria-label="分页"
          className="flex items-center justify-between gap-3"
        >
          <Text className="font-mono text-[0.78rem] text-ink-faint">
            共 {data?.total ?? 0} 项 · 第 {page} / {totalPages} 页
          </Text>
          <div className="flex items-center gap-2">
            <Button
              className="
                min-h-10.5 rounded-control border border-edge bg-surface px-3
                font-mono text-[0.82rem] text-ink outline-none
                hover:border-input-hover-edge
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
              "
              isDisabled={page <= 1}
              onPress={() => {
                setPage((current) => Math.max(1, current - 1));
                setLoading(true);
                setError('');
              }}
            >
              上一页
            </Button>
            <Button
              className="
                min-h-10.5 rounded-control border border-edge bg-surface px-3
                font-mono text-[0.82rem] text-ink outline-none
                hover:border-input-hover-edge
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
              "
              isDisabled={page >= totalPages}
              onPress={() => {
                setPage((current) => current + 1);
                setLoading(true);
                setError('');
              }}
            >
              下一页
            </Button>
          </div>
        </nav>
      </div>

      <UploadDialog
        onUploaded={() => {
          setFilters(EMPTY_FILTER);
          setPage(1);
          setLoading(true);
          setError('');
          setReloadKey((current) => current + 1);
        }}
        open={uploadOpen}
        setOpen={setUploadOpen}
      />
    </div>
  );
};
