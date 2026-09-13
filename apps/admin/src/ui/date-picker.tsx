import { parseDate } from '@internationalized/date';
import { cn } from 'cn';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Group,
  Popover,
} from 'react-aria-components';

import { controlClass } from './form';

const dateGroupClass = cn(
  controlClass,
  `
    flex min-w-0 items-center gap-1 px-2
    focus-within:border-accent focus-within:outline-2
    focus-within:outline-offset-1 focus-within:outline-focus
  `,
);

export const DatePicker = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <AriaDatePicker
    aria-label={label}
    className="min-w-0 flex-1"
    onChange={(date) => onChange(date?.toString() ?? '')}
    value={value ? parseDate(value) : null}
  >
    <Group className={dateGroupClass}>
      <DateInput className="flex min-w-0 flex-1 items-center overflow-hidden">
        {(segment) => (
          <DateSegment
            className={({ isFocused, isPlaceholder }) =>
              cn(
                'rounded-sm px-0.5 outline-none',
                isPlaceholder && 'text-ink-dim',
                isFocused && 'bg-accent-wash text-accent-text',
              )
            }
            segment={segment}
          />
        )}
      </DateInput>
      <AriaButton
        aria-label={`打开${label}日历`}
        className="
          grid size-8 shrink-0 place-items-center rounded-control text-ink-dim
          transition-colors
          hover:bg-accent-wash hover:text-accent-text
        "
        slot="trigger"
      >
        <CalendarDays aria-hidden className="size-4" />
      </AriaButton>
    </Group>

    <Popover
      className="
        w-[min(20rem,calc(100vw-2rem))] rounded-panel bg-case-raised p-3
        shadow-float outline-none
      "
      offset={8}
      placement="bottom start"
    >
      <Calendar className="grid gap-3">
        <header className="flex items-center gap-1">
          <AriaButton
            aria-label="上个月"
            className="
              grid size-8 place-items-center rounded-control text-ink-dim
              transition-colors
              hover:bg-accent-wash hover:text-accent-text
            "
            slot="previous"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </AriaButton>
          <CalendarHeading className="flex-1 text-center font-mono text-xs text-ink-strong" />
          <AriaButton
            aria-label="下个月"
            className="
              grid size-8 place-items-center rounded-control text-ink-dim
              transition-colors
              hover:bg-accent-wash hover:text-accent-text
            "
            slot="next"
          >
            <ChevronRight aria-hidden className="size-4" />
          </AriaButton>
        </header>

        <CalendarGrid className="w-full table-fixed border-separate border-spacing-0">
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className="h-7 text-center font-mono text-2xs text-ink-dim">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => (
              <CalendarCell
                className={({ isSelected, isToday }) =>
                  cn(
                    `
                      mx-auto grid size-9 place-items-center rounded-control
                      font-mono text-xs transition-colors
                    `,
                    isSelected
                      ? 'bg-accent text-accent-on'
                      : `
                        text-ink
                        hover:bg-accent-wash hover:text-accent-text
                      `,
                    isToday && !isSelected && 'font-medium text-accent-text',
                  )
                }
                date={date}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </Calendar>
    </Popover>
  </AriaDatePicker>
);
