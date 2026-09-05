import type { OverviewRankItem } from '@grey-flowers/contracts';

export const RankBars = ({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: readonly OverviewRankItem[];
}) => {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <ol
      aria-label={ariaLabel}
      className="
        grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center
        gap-x-3 gap-y-2
      "
    >
      {items.map((item) => (
        <li
          className="col-span-3 grid grid-cols-subgrid items-center"
          key={item.name}
        >
          <span className="truncate text-base text-ink" title={item.name}>
            {item.name}
          </span>
          <span aria-hidden className="h-2.5 w-full bg-well">
            <span
              className="block h-full bg-accent"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="font-mono text-base text-ink-strong">
            {item.count}
          </span>
        </li>
      ))}
    </ol>
  );
};
