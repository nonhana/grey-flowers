import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { FocusScope, mergeProps, useDialog, useModalOverlay } from 'react-aria';
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Tooltip as AriaTooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { Sheet } from 'react-modal-sheet';
import {
  type OverlayTriggerState,
  useOverlayTriggerState,
} from 'react-stately';

import { Button, IconButton } from './button.js';

const scrimClass = cn(
  'fixed inset-0 z-50 bg-scrim',
  `
    data-entering:animate-scrim-in
    data-exiting:animate-scrim-out
  `,
);

/* ─────────────────────────── 底部抽屉（移动端） ─────────────────────────── */

interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

const BottomSheetContents = ({
  children,
  state,
  title,
}: {
  children: ReactNode;
  state: OverlayTriggerState;
  title: string;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { dialogProps, titleProps } = useDialog({}, panelRef);
  const { modalProps } = useModalOverlay(
    { isDismissable: true },
    state,
    panelRef,
  );
  const {
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    onBlur,
    onFocus,
    onKeyDown,
    role,
    tabIndex,
  } = mergeProps(dialogProps, modalProps);
  return (
    // eslint-disable-next-line jsx-a11y/no-autofocus -- React Aria must move focus into this modal scope.
    <FocusScope autoFocus contain restoreFocus>
      <Sheet.Container
        aria-describedby={ariaDescribedBy}
        aria-labelledby={ariaLabelledBy}
        aria-modal
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        role={role}
        tabIndex={tabIndex}
        className={cn(
          '[--gf-surface:var(--color-case-raised)]',
          'max-h-[88dvh]! overflow-hidden rounded-t-sheet bg-case-raised',
          'shadow-float outline-none',
        )}
        ref={panelRef}
        unstyled
      >
        <h2 {...titleProps} className="sr-only">
          {title}
        </h2>
        <Sheet.Header
          className="
            grid cursor-grab justify-items-center pt-2.5 pb-1.5
            active:cursor-grabbing
          "
          unstyled
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-edge" />
        </Sheet.Header>
        <Sheet.Content
          className="min-h-0"
          scrollClassName="overscroll-contain"
          scrollStyle={{
            paddingBottom:
              'max(env(safe-area-inset-bottom), env(keyboard-inset-height, var(--keyboard-inset-height, 0px)))',
          }}
          unstyled
        >
          {children}
        </Sheet.Content>
      </Sheet.Container>
    </FocusScope>
  );
};

/**
 * 移动端的 sheet。交互、滚动与虚拟键盘避让由 react-modal-sheet 处理；
 * React Aria 负责模态语义、焦点和关闭行为。
 */
export const BottomSheet = ({
  children,
  isOpen,
  onOpenChange,
  title,
}: BottomSheetProps) => {
  const prefersReducedMotion = useReducedMotion();
  const state = useOverlayTriggerState({ isOpen, onOpenChange });

  return (
    <Sheet
      detent="content"
      isOpen={isOpen}
      onClose={state.close}
      prefersReducedMotion={prefersReducedMotion ?? false}
      style={{ zIndex: 50 }}
      unstyled
    >
      <BottomSheetContents state={state} title={title}>
        {children}
      </BottomSheetContents>
      <Sheet.Backdrop className="bg-scrim" unstyled />
    </Sheet>
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
