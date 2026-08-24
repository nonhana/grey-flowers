import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { FocusScope, mergeProps, useDialog, useModalOverlay } from 'react-aria';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Sheet } from 'react-modal-sheet';
import {
  type OverlayTriggerState,
  useOverlayTriggerState,
} from 'react-stately';

import { useMediaQuery } from '@/hooks/use-media-query.js';

import { Button, IconButton } from './button.js';

const scrimClass = cn(
  'fixed inset-0 z-50 bg-scrim',
  `
    data-entering:animate-scrim-in
    data-exiting:animate-scrim-out
  `,
);

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
          <span aria-hidden className="h-1 w-10 rounded-full bg-edge" />
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

/** 移动端 sheet：react-modal-sheet 管交互/滚动/键盘避让，React Aria 管模态语义。 */
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

/** 桌面端 sheet 是布局的一列：挤压纸面页边而不改正文行宽；内层定宽防回流。 */
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

/**
 * 移动端底抽屉本体：拖拽/回弹/背板/键盘避让/焦点圈定全走 react-modal-sheet，
 * 抽屉动画不手写（旧的手写 CSS 在内容异步加载时闪）。
 */
const AppDialogSheetContents = ({
  children,
  footer,
  isDismissable,
  state,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  isDismissable: boolean;
  state: OverlayTriggerState;
  title: string;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { dialogProps, titleProps } = useDialog({}, panelRef);
  const { modalProps } = useModalOverlay({ isDismissable }, state, panelRef);
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
          <span aria-hidden className="h-1 w-10 rounded-full bg-edge" />
        </Sheet.Header>
        <div
          className="
            flex items-center justify-between gap-3 border-b border-rule px-5
            py-3
          "
        >
          <span className="truncate text-md font-bold text-ink-strong">
            {title}
          </span>
          {isDismissable ? (
            <IconButton label="关闭" onPress={() => state.close()} size="sm">
              <X aria-hidden />
            </IconButton>
          ) : null}
        </div>
        <Sheet.Content
          className="min-h-0"
          scrollClassName="overscroll-contain"
          scrollStyle={{
            paddingBottom:
              'max(env(safe-area-inset-bottom), env(keyboard-inset-height, var(--keyboard-inset-height, 0px)))',
          }}
          unstyled
        >
          <div
            className="
              min-h-0 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]
            "
          >
            {children}
          </div>
        </Sheet.Content>
        {footer ? (
          <div
            className="
              flex justify-end border-t border-rule px-5 py-3
              pb-[max(1rem,env(safe-area-inset-bottom))]
            "
          >
            {footer}
          </div>
        ) : null}
      </Sheet.Container>
    </FocusScope>
  );
};

/** 哨兵：对话框树卸载（退出动画结束）时触发一次 onExited，供动画期间保留数据。 */
const ExitSignaler = ({ onExited }: { onExited?: () => void }) => {
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  });
  useEffect(() => () => onExitedRef.current?.(), []);
  return null;
};

export const AppDialog = ({
  children,
  footer,
  isDismissable = true,
  isOpen,
  onExited,
  onOpenChange,
  size = 'md',
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** 必须做出选择的对话框（例如内容冲突）设为 false，同时会隐藏关闭按钮。 */
  isDismissable?: boolean;
  isOpen: boolean;
  /** 退出动画结束后触发——对话框树真正卸载的那一刻。用于在动画期间保留内容数据。 */
  onExited?: () => void;
  onOpenChange: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  title: string;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const state = useOverlayTriggerState({ isOpen, onOpenChange });
  // 与旧实现一致：<640px 是抽屉，≥640px 是居中对话框。
  const isDialog = useMediaQuery('(min-width: 40rem)');

  if (isDialog) {
    return (
      <ModalOverlay
        className={cn(scrimClass, 'grid place-items-center p-6')}
        isDismissable={isDismissable}
        isKeyboardDismissDisabled={!isDismissable}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <Modal
          className={cn(
            'w-full overflow-hidden rounded-sheet bg-case-raised shadow-float',
            'outline-none',
            `
              data-entering:animate-dialog-in
              data-exiting:animate-dialog-out
            `,
            size === 'sm' && 'max-w-md',
            size === 'md' && 'max-w-lg',
            size === 'lg' && 'max-w-2xl',
          )}
        >
          {/*
            退出动画进行时 React Aria 仍保持这个子树挂载；
            动画结束、overlay 卸载时才触发 onExited。
          */}
          <ExitSignaler onExited={onExited} />
          <Dialog
            className={cn(
              'grid max-h-[88dvh] outline-none',
              footer ? 'grid-rows-[auto_1fr_auto]' : 'grid-rows-[auto_1fr]',
            )}
          >
            <div
              className="
                flex items-center justify-between gap-3 border-b border-rule
                px-5 py-3.5
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
                  <X aria-hidden />
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
            {footer ? (
              <div
                className="
                  flex justify-end border-t border-rule px-5 py-3
                  pb-[max(1rem,env(safe-area-inset-bottom))]
                "
              >
                {footer}
              </div>
            ) : null}
          </Dialog>
        </Modal>
      </ModalOverlay>
    );
  }

  return (
    <Sheet
      detent="content"
      isOpen={isOpen}
      onClose={() => {
        if (isDismissable) state.close();
      }}
      // react-modal-sheet 在关闭动画结束后触发。
      onCloseEnd={onExited}
      prefersReducedMotion={prefersReducedMotion ?? false}
      style={{ zIndex: 50 }}
      unstyled
    >
      <AppDialogSheetContents
        footer={footer}
        isDismissable={isDismissable}
        state={state}
        title={title}
      >
        {children}
      </AppDialogSheetContents>
      <Sheet.Backdrop className="bg-scrim" unstyled />
    </Sheet>
  );
};

/** 确认框：破坏性动作必须先让操作者看清后果再执行。 */
export const ConfirmDialog = ({
  confirmLabel,
  isDestructive = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  onExited,
  title,
}: {
  confirmLabel: string;
  isDestructive?: boolean;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** 退出动画结束后触发（见 AppDialog）。用于在动画期间保留内容数据。 */
  onExited?: () => void;
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
      <ExitSignaler onExited={onExited} />
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
