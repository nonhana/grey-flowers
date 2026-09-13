import { RotateCcw } from 'lucide-react';

import { Button } from '@/ui/button';
import { DatePicker } from '@/ui/date-picker';
import { SearchInput, TextField } from '@/ui/form';

export interface CommentFilterDraft {
  authorId: string;
  endDate: string;
  path: string;
  search: string;
  startDate: string;
}

export const EMPTY_FILTER: CommentFilterDraft = {
  authorId: '',
  endDate: '',
  path: '',
  search: '',
  startDate: '',
};

/** 筛选草稿 → URL search 补丁：authorId 收敛规则与 search.ts 的 zod schema 同语义，提交筛选即重置页码 */
export const commentsFilterToSearch = (draft: CommentFilterDraft) => {
  const authorId = draft.authorId.trim();
  return {
    authorId: /^\d+$/.test(authorId) ? Number(authorId) : undefined,
    endDate: draft.endDate || undefined,
    page: undefined,
    path: draft.path.trim() || undefined,
    search: draft.search.trim() || undefined,
    startDate: draft.startDate || undefined,
  };
};

const dateRangeClass =
  'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-2 md:flex md:gap-1.5';

export const FilterControls = ({
  onChange,
  value,
}: {
  onChange: (next: CommentFilterDraft) => void;
  value: CommentFilterDraft;
}) => {
  const set = (field: keyof CommentFilterDraft) => {
    return (fieldValue: string) => onChange({ ...value, [field]: fieldValue });
  };
  const hasFilter =
    value.search !== '' ||
    value.path !== '' ||
    value.authorId !== '' ||
    value.startDate !== '' ||
    value.endDate !== '';

  return (
    <section
      aria-label="筛选评论"
      className="
        grid grid-cols-1 gap-3
        md:grid-cols-2
        xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_8rem_minmax(20rem,1.2fr)_auto]
      "
    >
      <div className="grid min-w-0 gap-1.5">
        <span className="font-mono text-xs text-ink-dim">评论内容</span>
        <SearchInput
          className="min-w-0"
          label="搜索评论内容"
          onChange={set('search')}
          placeholder="搜索内容…"
          value={value.search}
        />
      </div>
      <TextField
        className="min-w-0"
        inputClassName="font-mono text-xs"
        label="页面路径"
        onChange={set('path')}
        placeholder="/recently?id=12"
        value={value.path}
      />
      <TextField
        className="min-w-0"
        inputClassName="font-mono text-xs"
        label="作者 ID"
        onChange={set('authorId')}
        placeholder="作者 ID"
        value={value.authorId}
      />
      <div className="grid min-w-0 gap-1.5">
        <span className="font-mono text-xs text-ink-dim">发表日期</span>
        <div className={dateRangeClass}>
          <span aria-hidden className="shrink-0 text-xs text-ink-dim">
            从
          </span>
          <DatePicker
            label="开始日期"
            onChange={set('startDate')}
            value={value.startDate}
          />
          <span aria-hidden className="shrink-0 text-xs text-ink-dim">
            至
          </span>
          <DatePicker
            label="结束日期"
            onChange={set('endDate')}
            value={value.endDate}
          />
        </div>
      </div>
      {hasFilter ? (
        <Button
          className="self-end justify-self-start"
          icon={<RotateCcw aria-hidden />}
          onPress={() => onChange(EMPTY_FILTER)}
          size="md"
          tone="ghost"
        >
          重置
        </Button>
      ) : null}
    </section>
  );
};
