import type { ComponentProps, ReactNode } from 'react';

import { cn } from 'cn';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Text,
  TextArea,
  TextField as AriaTextField,
  Button as AriaButton,
} from 'react-aria-components';

export const controlClass =
  'min-h-11 w-full rounded-control border border-edge bg-well px-3 py-2 text-md text-ink-strong transition-colors outline-none placeholder:text-ink-dim hover:not-disabled:border-edge-hover focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:opacity-55 data-invalid:border-danger-rule';

const labelClass = 'font-mono text-xs text-ink-dim';
const hintClass = 'text-xs leading-relaxed text-ink-dim';
const errorClass = 'text-xs leading-relaxed text-danger-text';

export const FieldLabel = ({
  children,
  className,
  ...rest
}: ComponentProps<'span'>) => (
  <span className={cn(labelClass, className)} {...rest}>
    {children}
  </span>
);

interface FieldShellProps {
  description?: string;
  errorMessage?: string;
  label: string;
}

interface TextFieldProps
  extends
    Omit<ComponentProps<typeof AriaTextField>, 'className' | 'children'>,
    FieldShellProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export const TextField = ({
  autoComplete,
  className,
  description,
  errorMessage,
  inputClassName,
  label,
  placeholder,
  ...rest
}: TextFieldProps & { autoComplete?: string }) => (
  <AriaTextField className={cn('grid gap-1.5', className)} {...rest}>
    <Label className={labelClass}>{label}</Label>
    <Input
      autoComplete={autoComplete}
      className={cn(controlClass, inputClassName)}
      placeholder={placeholder}
    />
    {description ? (
      <Text className={hintClass} slot="description">
        {description}
      </Text>
    ) : null}
    <FieldError className={errorClass}>{errorMessage}</FieldError>
  </AriaTextField>
);

interface TextAreaFieldProps extends TextFieldProps {
  rows?: number;
}

export const TextAreaField = ({
  className,
  description,
  errorMessage,
  inputClassName,
  label,
  placeholder,
  rows = 3,
  ...rest
}: TextAreaFieldProps) => (
  <AriaTextField className={cn('grid gap-1.5', className)} {...rest}>
    <Label className={labelClass}>{label}</Label>
    <TextArea
      className={cn(controlClass, 'resize-y leading-relaxed', inputClassName)}
      placeholder={placeholder}
      rows={rows}
    />
    {description ? (
      <Text className={hintClass} slot="description">
        {description}
      </Text>
    ) : null}
    <FieldError className={errorClass}>{errorMessage}</FieldError>
  </AriaTextField>
);

interface SelectFieldProps<T extends string> {
  className?: string;
  hideLabel?: boolean;
  label: string;
  onChange: (value: T | undefined) => void;
  optionLabels: Record<string, string>;
  options: readonly T[];
  placeholderLabel?: string;
  value: T | undefined;
}

const ALL_KEY = '__all__';

export const SelectField = <T extends string>({
  className,
  hideLabel = false,
  label,
  onChange,
  optionLabels,
  options,
  placeholderLabel = '全部',
  value,
}: SelectFieldProps<T>) => (
  <div className={cn('grid min-w-0 gap-1.5', className)}>
    {hideLabel ? null : <FieldLabel>{label}</FieldLabel>}
    <Select
      aria-label={label}
      className="min-w-0"
      onChange={(key) => {
        onChange(key === null || key === ALL_KEY ? undefined : (key as T));
      }}
      value={value ?? ALL_KEY}
    >
      <AriaButton
        className={cn(
          controlClass,
          `
            flex items-center justify-between gap-2 text-left
            [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-dim
          `,
        )}
      >
        <SelectValue className="truncate text-md text-ink-strong">
          {({ defaultChildren }) =>
            hideLabel && value !== undefined
              ? `${label} · ${optionLabels[value]}`
              : defaultChildren
          }
        </SelectValue>
        <ChevronDown aria-hidden />
      </AriaButton>
      <Popover
        className="
          w-(--trigger-width) min-w-40 overflow-hidden rounded-panel
          bg-case-raised p-1 shadow-float
        "
      >
        <ListBox className="grid gap-0.5 outline-none">
          <ListBoxItem
            className="
              flex cursor-pointer items-center justify-between gap-2
              rounded-control px-2.5 py-2 text-base text-ink outline-none
              data-focused:bg-accent-wash data-focused:text-accent-text
              data-selected:text-accent-text
            "
            id={ALL_KEY}
            textValue={placeholderLabel}
          >
            {({ isSelected }) => (
              <>
                {placeholderLabel}
                {isSelected ? <Check aria-hidden className="size-3.5" /> : null}
              </>
            )}
          </ListBoxItem>
          {options.map((option) => (
            <ListBoxItem
              className="
                flex cursor-pointer items-center justify-between gap-2
                rounded-control px-2.5 py-2 text-base text-ink outline-none
                data-focused:bg-accent-wash data-focused:text-accent-text
                data-selected:text-accent-text
              "
              id={option}
              key={option}
              textValue={optionLabels[option]}
            >
              {({ isSelected }) => (
                <>
                  {optionLabels[option]}
                  {isSelected ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : null}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  </div>
);

interface SearchInputProps {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export const SearchInput = ({
  className,
  label,
  onChange,
  placeholder,
  value,
}: SearchInputProps) => (
  <div className={cn('relative', className)}>
    <Search
      aria-hidden
      className="
        pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2
        text-ink-dim
      "
    />
    <input
      aria-label={label}
      className={cn(controlClass, 'pr-3 pl-9')}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  </div>
);

/** 可切换的筛选筹码。选中态同时改变填充与描边，不只靠颜色。 */
export const FilterChip = ({
  children,
  isSelected,
  onPress,
}: {
  children: ReactNode;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <AriaButton
    aria-pressed={isSelected}
    className={cn(
      `
        inline-flex min-h-9 items-center rounded-full border px-3.5 font-mono
        text-xs transition-colors duration-150
      `,
      isSelected
        ? 'border-accent-rule bg-accent-wash text-accent-text'
        : `
          border-edge text-ink-dim
          hover:border-edge-hover hover:text-ink
        `,
    )}
    onPress={onPress}
  >
    {children}
  </AriaButton>
);
