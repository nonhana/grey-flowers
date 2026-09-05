import { cn } from 'cn';

export interface ShareSegment {
  label: string;
  value: number;
  tone: 'strong' | 'mid' | 'faint';
}

const SHARE_FILL: Record<ShareSegment['tone'], string> = {
  faint: 'bg-edge',
  mid: 'bg-accent-rule',
  strong: 'bg-accent',
};

export const ShareBar = ({
  ariaLabel,
  format,
  segments,
}: {
  ariaLabel: string;
  format: (value: number) => string;
  segments: readonly ShareSegment[];
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const visible = segments.filter((segment) => segment.value > 0);
  const share = (value: number) => (total === 0 ? 0 : (value / total) * 100);

  return (
    <div className="grid gap-3">
      <div
        aria-label={ariaLabel}
        className="flex h-2.5 w-full overflow-hidden bg-well"
        role="img"
      >
        {visible.map((segment) => (
          <span
            className={SHARE_FILL[segment.tone]}
            key={segment.label}
            style={{ width: `${share(segment.value)}%` }}
          />
        ))}
      </div>

      <ul className="grid gap-1.5">
        {segments.map((segment) => (
          <li className="flex items-baseline gap-2" key={segment.label}>
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 translate-y-px',
                SHARE_FILL[segment.tone],
              )}
            />
            <span className="min-w-0 flex-1 truncate text-base text-ink">
              {segment.label}
            </span>
            <span className="font-mono text-base text-ink-strong">
              {format(segment.value)}
            </span>
            <span className="w-10 text-right font-mono text-2xs text-ink-dim">
              {total === 0 ? '—' : `${share(segment.value).toFixed(0)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
