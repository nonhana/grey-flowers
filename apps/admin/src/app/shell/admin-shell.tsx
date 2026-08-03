import type { Principal } from '@grey-flowers/contracts';
import type { ReactNode } from 'react';

import { RouterProvider } from '@tanstack/react-router';
import {
  CloudOff,
  Flower2,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldX,
} from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components';

import { router } from '../../routes/route-tree.js';
import { useAuth } from '../providers.js';

/** 圆形状态标记：waiting 用品牌蓝 + 长转，warning/error 用对应语义色。 */
function StatusMark({
  tone,
  children,
}: {
  tone: 'waiting' | 'warning' | 'error';
  children: ReactNode;
}) {
  const toneClass =
    tone === 'waiting'
      ? 'text-brand [&_svg]:animate-spin [&_svg]:[animation-duration:1.2s]'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-danger';

  return (
    <span
      className={`
        inline-grid size-10.5 place-items-center rounded-full border
        border-current
        ${toneClass}
        [&_svg]:size-5
      `}
    >
      {children}
    </span>
  );
}

const STAGE =
  'grid min-h-screen place-items-center p-6 max-[480px]:items-start max-[480px]:p-4 max-[480px]:pt-[12vh]';

const PANEL =
  'grid w-full max-w-[430px] gap-[22px] rounded-panel border border-edge bg-surface p-[clamp(24px,6vw,42px)] shadow-panel max-[480px]:gap-[19px]';

const PANEL_COMPACT = `${PANEL} justify-items-center text-center`;

const KICKER =
  'm-0 font-mono text-[0.7rem] leading-[1.4] text-ink-faint tabular-nums';

const HEADING = 'm-0 text-[1.8rem] leading-[1.22] text-ink-strong';

const MUTED = 'm-0 text-[0.96rem] leading-[1.7] text-ink-muted';

function LoadingScreen() {
  return (
    <section className={STAGE} aria-live="polite">
      <div className={PANEL_COMPACT}>
        <StatusMark tone="waiting">
          <RefreshCw aria-hidden="true" />
        </StatusMark>
        <p className={KICKER}>GREY FLOWERS / ADMIN</p>
        <h1 className={HEADING}>正在确认管理权限</h1>
      </div>
    </section>
  );
}

function LoginScreen({
  error,
  isSubmitting,
}: {
  error?: string;
  isSubmitting: boolean;
}) {
  const { signIn } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  return (
    <section className={STAGE}>
      <Form
        className={PANEL}
        onSubmit={(event) => {
          event.preventDefault();
          void signIn({ account: account.trim(), password });
        }}
      >
        <div
          className="
            flex items-center gap-2 font-mono text-[0.78rem] text-brand
            [&_svg]:size-5
          "
        >
          <Flower2 aria-hidden="true" />
          <span>Grey Flowers</span>
        </div>
        <div className="grid gap-2">
          <p className={KICKER}>ADMIN ACCESS</p>
          <h1 className={HEADING}>管理后台</h1>
          <p className={MUTED}>使用你的 Grey Flowers 账户继续。</p>
        </div>
        <TextField
          className="grid gap-1.75"
          isRequired
          name="account"
          type="text"
          value={account}
          onChange={setAccount}
        >
          <Label className="font-mono text-[0.78rem] text-ink-soft">
            邮箱或用户名
          </Label>
          <Input
            autoComplete="username"
            className="
              min-h-11 w-full rounded-control border border-input-edge bg-input
              px-2.75 py-2.25 text-base leading-[1.4] text-primary-ink
              outline-none
              placeholder:text-input-placeholder
              hover:border-input-hover-edge
              focus-visible:border-focus focus-visible:ring-[3px]
              focus-visible:ring-focus-ring
              aria-invalid:border-danger-edge
            "
            placeholder="name@example.com"
          />
          <FieldError className="text-[0.82rem] leading-[1.4] text-danger-text">
            请输入邮箱或用户名。
          </FieldError>
        </TextField>
        <TextField
          className="grid gap-1.75"
          isRequired
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
        >
          <Label className="font-mono text-[0.78rem] text-ink-soft">密码</Label>
          <Input
            autoComplete="current-password"
            className="
              min-h-11 w-full rounded-control border border-input-edge bg-input
              px-2.75 py-2.25 text-base leading-[1.4] text-primary-ink
              outline-none
              placeholder:text-input-placeholder
              hover:border-input-hover-edge
              focus-visible:border-focus focus-visible:ring-[3px]
              focus-visible:ring-focus-ring
              aria-invalid:border-danger-edge
            "
          />
          <FieldError className="text-[0.82rem] leading-[1.4] text-danger-text">
            请输入密码。
          </FieldError>
        </TextField>
        {error ? (
          <p
            className="
              -mt-1.5 border-l-[3px] border-l-danger-edge bg-danger-soft px-2.5
              py-2.25 text-[0.88rem] leading-normal text-danger-ink
            "
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button
          className="
            flex min-h-10.5 items-center justify-center gap-2 rounded-control
            border border-transparent bg-primary px-3.5 py-2.25 font-mono
            text-[0.82rem] leading-[1.2] text-on-primary transition-colors
            duration-150 ease-out
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            hover:enabled:bg-primary-deep
            [&_svg]:size-4
          "
          type="submit"
          isDisabled={isSubmitting}
        >
          <LockKeyhole aria-hidden="true" />
          {isSubmitting ? '正在登录' : '登录'}
        </Button>
      </Form>
    </section>
  );
}

function ForbiddenScreen() {
  const { useAnotherAccount } = useAuth();

  return (
    <section className={STAGE}>
      <div className={PANEL_COMPACT} role="alert">
        <StatusMark tone="warning">
          <ShieldX aria-hidden="true" />
        </StatusMark>
        <p className={KICKER}>ACCESS DENIED</p>
        <h1 className={HEADING}>此账户没有后台权限</h1>
        <p className={MUTED}>请使用具有管理员权限的账户登录。</p>
        <Button
          className="
            flex min-h-10.5 items-center justify-center gap-2 rounded-control
            border border-transparent bg-accent px-3.5 py-2.25 font-mono
            text-[0.82rem] leading-[1.2] text-accent-text transition-colors
            duration-150 ease-out
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            hover:enabled:border-accent-hover-edge hover:enabled:bg-accent-hover
          "
          onPress={useAnotherAccount}
        >
          使用其他账户
        </Button>
      </div>
    </section>
  );
}

function NetworkErrorScreen({ error }: { error: string }) {
  const { retry } = useAuth();

  return (
    <section className={STAGE}>
      <div className={PANEL_COMPACT} role="alert">
        <StatusMark tone="error">
          <CloudOff aria-hidden="true" />
        </StatusMark>
        <p className={KICKER}>CONNECTION PAUSED</p>
        <h1 className={HEADING}>暂时无法连接身份服务</h1>
        <p className={MUTED}>{error}</p>
        <Button
          className="
            flex min-h-10.5 items-center justify-center gap-2 rounded-control
            border border-transparent bg-accent px-3.5 py-2.25 font-mono
            text-[0.82rem] leading-[1.2] text-accent-text transition-colors
            duration-150 ease-out
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
            hover:enabled:border-accent-hover-edge hover:enabled:bg-accent-hover
            [&_svg]:size-4
          "
          onPress={() => void retry()}
        >
          <RefreshCw aria-hidden="true" />
          重试
        </Button>
      </div>
    </section>
  );
}

function AuthenticatedShell({
  principal,
  logoutError,
}: {
  principal: Principal;
  logoutError?: string;
}) {
  const { isSigningOut, signOut } = useAuth();

  return (
    <main
      className="
        grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr]
      "
    >
      <header
        className="
          flex min-h-15 items-center justify-between border-b border-edge
          bg-surface px-[clamp(16px,5vw,64px)] py-2.5
          max-[480px]:px-4
        "
      >
        <div
          className="
            flex items-center gap-2 font-mono text-[0.84rem] text-brand-deep
            [&_svg]:size-5
          "
        >
          <Flower2 aria-hidden="true" />
          <span>Grey Flowers</span>
          <span className="border-l border-section-edge pl-2 text-section-text">
            Admin
          </span>
        </div>
        <div
          className="
            flex items-center gap-2.5 font-mono text-[0.78rem] text-ink-soft
          "
        >
          <span className="max-[480px]:hidden">{principal.username}</span>
          {isSigningOut ? (
            <span
              className="
                text-ink-faint
                max-[480px]:hidden
              "
              aria-live="polite"
            >
              正在退出
            </span>
          ) : null}
          <TooltipTrigger delay={0}>
            <Button
              aria-label={isSigningOut ? '正在退出登录' : '退出登录'}
              className="
                grid size-8.5 place-items-center rounded-control border
                border-logout-edge bg-transparent text-logout-text
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
                hover:enabled:border-logout-hover-edge hover:enabled:bg-accent
                hover:enabled:text-accent-text
                [&_svg]:size-4
              "
              isDisabled={isSigningOut}
              onPress={() => void signOut()}
            >
              <LogOut aria-hidden="true" />
            </Button>
            <Tooltip
              className="
                rounded-sm bg-tooltip px-2 py-1.5 font-mono text-[0.72rem]
                text-tooltip-text
              "
            >
              退出登录
            </Tooltip>
          </TooltipTrigger>
        </div>
      </header>
      <section className="h-full min-h-0 min-w-0">
        {logoutError ? (
          <p
            className="
              -mt-1.5 border-l-[3px] border-l-danger-edge bg-danger-soft px-2.5
              py-2.25 text-[0.88rem] leading-normal text-danger-ink
            "
            role="alert"
          >
            {logoutError}
          </p>
        ) : null}
        <RouterProvider router={router} />
      </section>
    </main>
  );
}

export function AdminShell() {
  const { state, isSubmitting } = useAuth();

  switch (state.status) {
    case 'checking':
      return <LoadingScreen />;
    case 'unauthenticated':
      return <LoginScreen error={state.error} isSubmitting={isSubmitting} />;
    case 'forbidden':
      return <ForbiddenScreen />;
    case 'network-error':
      return <NetworkErrorScreen error={state.error} />;
    case 'authenticated':
      return (
        <AuthenticatedShell
          principal={state.principal}
          logoutError={state.logoutError}
        />
      );
  }
}
