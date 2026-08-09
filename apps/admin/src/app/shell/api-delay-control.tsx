import { Gauge } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { readApiDelayMs, writeApiDelayMs } from '@/app/api/delay.js';
import { Button, buttonClass, controlClass, IconButton } from '@/ui/index.js';

const PRESETS = [0, 300, 1000, 3000] as const;

/**
 * 调试控件：统一接口延迟（ms），改完立即生效，刷新保留。
 * 仅开发模式渲染（生产构建被 tree-shake 掉）。
 * URL 查询参数 `?apiDelay=` 优先级更高，浮层里如实标注。
 */
export const ApiDelayControl = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => readApiDelayMs());
  const [draft, setDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!import.meta.env.DEV) return null;

  const apply = (ms: number) => {
    writeApiDelayMs(ms);
    setValue(ms);
    setDraft('');
    setOpen(false);
  };

  const applyDraft = () => {
    const ms = Number(draft);
    if (Number.isFinite(ms) && ms >= 0) apply(ms);
  };

  return (
    <div className="relative" ref={rootRef}>
      <IconButton
        label={value > 0 ? `接口延迟 ${value} ms` : '接口延迟（调试）'}
        onPress={() => {
          setValue(readApiDelayMs());
          setOpen((current) => !current);
        }}
        size="sm"
        tone="ghost"
      >
        <Gauge aria-hidden />
      </IconButton>

      {open ? (
        <div
          className="
            absolute left-0 bottom-full z-50 mb-2 grid w-64 gap-2.5
            rounded-panel bg-case-raised p-3 shadow-float
          "
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-xs text-ink-dim">接口延迟</span>
            <span className="font-mono text-2xs text-ink-dim">
              {value > 0 ? `${value} ms` : '关闭'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((ms) => (
              <button
                className={buttonClass({ size: 'sm', tone: 'quiet' })}
                key={ms}
                onClick={() => apply(ms)}
                type="button"
              >
                {ms === 0 ? '关闭' : `${ms}ms`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              aria-label="自定义延迟毫秒数"
              className={controlClass}
              inputMode="numeric"
              min={0}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyDraft();
              }}
              placeholder="自定义 ms"
              type="number"
              value={draft}
            />
            <Button
              isDisabled={!Number.isFinite(Number(draft)) || Number(draft) < 0}
              onPress={applyDraft}
              size="sm"
              tone="quiet"
            >
              应用
            </Button>
          </div>

          <p className="font-mono text-2xs text-ink-dim">
            仅开发模式；localStorage 保存，刷新保留。URL ?apiDelay=3000
            可临时覆盖。
          </p>
        </div>
      ) : null}
    </div>
  );
};
