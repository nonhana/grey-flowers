import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Tooltip as AriaTooltip,
  TooltipTrigger,
} from 'react-aria-components';

import { Button, IconButton } from './button.js';

const scrimClass = cn(
  'fixed inset-0 z-50 bg-scrim',
  `
    data-entering:animate-scrim-in
    data-exiting:animate-scrim-out
  `,
);

/* ─────────────────────────── 底部抽屉（移动端） ─────────────────────────── */

const DISMISS_DISTANCE = 96;

/**
 * 移动端的 sheet。抓手是真能拖的：跟手下滑，越过阈值松手即关闭。
 * 这是「移动端是一等写作设备」这条原则最先被检验的地方。
 */
export const BottomSheet = ({
  children,
  isOpen,
  onOpenChange,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const endDrag = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (dragOffset > DISMISS_DISTANCE) onOpenChange(false);
    setDragOffset(0);
  };

  return (
    <ModalOverlay
      className={scrimClass}
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal
        className={cn(
          '[--gf-surface:var(--color-case-raised)]',
          'absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden',
          'rounded-t-sheet bg-case-raised shadow-float outline-none',
          `
            data-entering:animate-sheet-in
            data-exiting:animate-sheet-out
          `,
        )}
        ref={panelRef}
        style={
          dragOffset > 0
            ? { transform: `translateY(${String(dragOffset)}px)` }
            : undefined
        }
      >
        <Dialog
          aria-label={title}
          className="grid max-h-[88dvh] grid-rows-[auto_1fr] outline-none"
        >
          <div
            className="
              grid cursor-grab touch-none justify-items-center pt-2.5 pb-1.5
              active:cursor-grabbing
            "
            onPointerCancel={endDrag}
            onPointerDown={(event) => {
              startY.current = event.clientY;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (startY.current === null) return;
              setDragOffset(Math.max(0, event.clientY - startY.current));
            }}
            onPointerUp={endDrag}
          >
            <span
              aria-hidden="true"
              className="h-1 w-10 rounded-full bg-edge"
            />
          </div>
          <div
            className="
              min-h-0 overflow-y-auto overscroll-contain
              pb-[env(safe-area-inset-bottom)]
            "
          >
            {children}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};

/* ─────────────────────────── 侧栏面板（桌面） ─────────────────────────── */

/**
 * 桌面端的 sheet 不是浮层，是布局的一列：它推入时挤压纸面的页边，
 * 而不改变正文行宽 —— 所以查看元数据时正文一个字都不会重排。
 * 内层固定宽度，只让外层宽度过渡，避免过渡期间文字回流。
 */
export const SidePanel = ({
  children,
  isOpen,
  label,
  width = 380,
}: {
  children: ReactNode;
  isOpen: boolean;
  label: string;
  width?: number;
}) => (
  <aside
    aria-hidden={!isOpen}
    aria-label={label}
    className={cn(
      // --gf-surface 让面板里的吸底条知道自己该刷成什么颜色 ——
      // 桌面端它是布局的一列（字盘），移动端它是浮起的 sheet（抬起的字盘）。
      '[--gf-surface:var(--color-case)]',
      'h-full shrink-0 overflow-hidden border-l border-rule bg-case',
      'transition-[width] duration-200 ease-out',
      !isOpen && 'pointer-events-none border-l-0',
    )}
    style={{ width: isOpen ? width : 0 }}
  >
    <div className="h-full overflow-y-auto" style={{ width }}>
      {children}
    </div>
  </aside>
);

/* ─────────────────────────────── 对话框 ─────────────────────────────── */

export const AppDialog = ({
  children,
  isDismissable = true,
  isOpen,
  onOpenChange,
  size = 'md',
  title,
}: {
  children: ReactNode;
  /** 必须做出选择的对话框（例如内容冲突）设为 false，同时会隐藏关闭按钮。 */
  isDismissable?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  title: string;
}) => (
  <ModalOverlay
    className={cn(
      scrimClass,
      `
        grid place-items-end
        sm:place-items-center sm:p-6
      `,
    )}
    isDismissable={isDismissable}
    isKeyboardDismissDisabled={!isDismissable}
    isOpen={isOpen}
    onOpenChange={onOpenChange}
  >
    <Modal
      className={cn(
        `
          w-full overflow-hidden rounded-t-sheet bg-case-raised shadow-float
          outline-none
        `,
        `
          data-entering:animate-sheet-in
          data-exiting:animate-sheet-out
        `,
        `
          sm:rounded-sheet
          sm:data-entering:animate-dialog-in
          sm:data-exiting:animate-dialog-out
        `,
        size === 'sm' && 'sm:max-w-md',
        size === 'md' && 'sm:max-w-lg',
        size === 'lg' && 'sm:max-w-2xl',
      )}
    >
      <Dialog className="grid max-h-[88dvh] grid-rows-[auto_1fr] outline-none">
        <div
          className="
            flex items-center justify-between gap-3 border-b border-rule px-5
            py-3.5
          "
        >
          <Heading
            className="truncate text-md font-bold text-ink-strong"
            slot="title"
          >
            {title}
          </Heading>
          {isDismissable ? (
            <IconButton
              label="关闭"
              onPress={() => onOpenChange(false)}
              size="sm"
            >
              <X aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>
        <div
          className="
            min-h-0 overflow-y-auto px-5 py-4
            pb-[max(1rem,env(safe-area-inset-bottom))]
          "
        >
          {children}
        </div>
      </Dialog>
    </Modal>
  </ModalOverlay>
);

/**
 * 确认框。破坏性动作必须先用操作者自己的话说清后果，再执行。
 */
export const ConfirmDialog = ({
  confirmLabel,
  isDestructive = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  isDestructive?: boolean;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) => (
  <ModalOverlay
    className={cn(scrimClass, 'grid place-items-center p-5')}
    isDismissable
    isOpen={isOpen}
    onOpenChange={(open) => {
      if (!open) onCancel();
    }}
  >
    <Modal
      className={cn(
        `
          w-full max-w-md rounded-sheet bg-case-raised p-5 shadow-float
          outline-none
        `,
        `
          data-entering:animate-dialog-in
          data-exiting:animate-dialog-out
        `,
      )}
    >
      <Dialog className="outline-none" role="alertdialog">
        <Heading className="text-md font-bold text-ink-strong" slot="title">
          {title}
        </Heading>
        <p className="mt-2 text-base/relaxed text-ink">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onPress={onCancel} tone="quiet">
            取消
          </Button>
          <Button onPress={onConfirm} tone={isDestructive ? 'danger' : 'solid'}>
            {confirmLabel}
          </Button>
        </div>
      </Dialog>
    </Modal>
  </ModalOverlay>
);

/* ─────────────────────────────── 工具提示 ─────────────────────────────── */

export const Hint = ({
  children,
  label,
  placement = 'bottom',
}: {
  children: ReactNode;
  label: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}) => (
  <TooltipTrigger delay={350}>
    {children}
    <AriaTooltip
      className={cn(
        'rounded-control bg-ink-strong px-2 py-1 font-mono text-2xs text-canvas',
        `
          shadow-float
          data-entering:animate-pop-in
        `,
      )}
      offset={6}
      placement={placement}
    >
      {label}
    </AriaTooltip>
  </TooltipTrigger>
);
