import { Gauge } from 'lucide-react';
import { useState } from 'react';
import { DialogTrigger, Popover } from 'react-aria-components';

import { readApiDelayMs, writeApiDelayMs } from '@/app/api/delay.js';
import { Button, buttonClass } from '@/ui/button.js';
import { controlClass } from '@/ui/form.js';

const PRESETS = [0, 300, 1000, 3000] as const;

/** 调试控件：接口延迟（ms）改完即生效、刷新保留；应用后收起 Popover。
 *  仅开发模式渲染——DEV 守卫在挂载点（ConsoleRail），生产 tree-shake 掉。
 *  外部点击/Esc 关闭由 React Aria Popover 的 dismissal 能力提供，无 document 级监听。 */
export const ApiDelayControl = () => {
  const [value, setValue] = useState(() => readApiDelayMs());
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

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
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <button
        aria-label={value > 0 ? `接口延迟 ${value} ms` : '接口延迟（调试）'}
        className={buttonClass({ size: 'sm', tone: 'ghost' })}
        type="button"
      >
        <Gauge aria-hidden />
      </button>
      <Popover
        className="
          grid w-64 gap-2.5 rounded-panel bg-case-raised p-3 shadow-float
        "
        placement="top"
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
      </Popover>
    </DialogTrigger>
  );
};
