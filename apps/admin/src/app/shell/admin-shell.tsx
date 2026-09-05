import type { ReactNode } from 'react';

import { RouterProvider } from '@tanstack/react-router';
import { cn } from 'cn';
import {
  CloudOff,
  Flower2,
  LockKeyhole,
  RefreshCw,
  ShieldX,
} from 'lucide-react';
import { useState } from 'react';
import { Form } from 'react-aria-components';

import { router } from '@/routes/router';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/button';
import { Alert } from '@/ui/feedback';
import { TextField } from '@/ui/form';

const Stage = ({ children }: { children: ReactNode }) => (
  <section
    className="
      grid min-h-full place-items-center gf-stage-grid px-4 py-10
      max-stage:items-start max-stage:pt-[12vh]
    "
  >
    <div
      className="
        grid w-full max-w-104 gap-6 rounded-sheet bg-case-raised p-7
        shadow-float
        max-stage:p-6
      "
    >
      {children}
    </div>
  </section>
);

const StatusMark = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'waiting' | 'warning' | 'error';
}) => (
  <span
    className={cn(
      'inline-grid size-11 place-items-center justify-self-center rounded-full',
      `
        border border-current
        [&_svg]:size-5
      `,
      tone === 'waiting' &&
        `
          text-accent-text
          [&_svg]:animate-spin [&_svg]:[animation-duration:1.4s]
        `,
      tone === 'warning' && 'text-warn-text',
      tone === 'error' && 'text-danger-text',
    )}
  >
    {children}
  </span>
);

const BrandLine = () => (
  <span className="flex items-center gap-2 font-mono text-base text-accent-text">
    <Flower2 aria-hidden className="size-5" />
    Grey Flowers
    <span className="text-2xs text-ink-dim">Admin</span>
  </span>
);

const Headline = ({ children }: { children: string }) => (
  <h1 className="text-2xl/tight font-bold text-ink-strong">{children}</h1>
);

const Muted = ({ children }: { children: ReactNode }) => (
  <p className="text-md/relaxed text-ink-dim">{children}</p>
);

const LoadingScreen = () => (
  <Stage>
    <div className="grid gap-4 text-center" aria-live="polite">
      <StatusMark tone="waiting">
        <RefreshCw aria-hidden />
      </StatusMark>
      <Headline>正在确认管理权限</Headline>
    </div>
  </Stage>
);

const LoginScreen = ({
  error,
  isSubmitting,
}: {
  error?: string;
  isSubmitting: boolean;
}) => {
  const { signIn } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Stage>
      <BrandLine />
      <div className="grid gap-2">
        <Headline>管理后台</Headline>
        <Muted>欢迎回来 Hana 酱！</Muted>
      </div>
      <Form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void signIn({ account: account.trim(), password });
        }}
      >
        <TextField
          autoComplete="username"
          errorMessage="请输入邮箱或用户名。"
          isRequired
          label="邮箱或用户名"
          name="account"
          onChange={setAccount}
          placeholder="name@example.com"
          type="text"
          value={account}
        />
        <TextField
          autoComplete="current-password"
          errorMessage="请输入密码。"
          isRequired
          label="密码"
          name="password"
          onChange={setPassword}
          type="password"
          value={password}
        />
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button
          className="mt-1 w-full"
          icon={<LockKeyhole aria-hidden />}
          isLoading={isSubmitting}
          size="lg"
          tone="solid"
          type="submit"
        >
          {isSubmitting ? '正在登录' : '登录'}
        </Button>
      </Form>
    </Stage>
  );
};

const ForbiddenScreen = () => {
  const { useAnotherAccount } = useAuth();

  return (
    <Stage>
      <div className="grid gap-4 text-center" role="alert">
        <StatusMark tone="warning">
          <ShieldX aria-hidden />
        </StatusMark>
        <Headline>此账户没有后台权限</Headline>
        <Muted>Hana 酱输入你自己的管理账户哦</Muted>
        <Button
          className="mt-1 justify-self-center"
          onPress={useAnotherAccount}
        >
          使用其他账户
        </Button>
      </div>
    </Stage>
  );
};

const NetworkErrorScreen = ({ error }: { error: string }) => {
  const { retry } = useAuth();

  return (
    <Stage>
      <div className="grid gap-4 text-center" role="alert">
        <StatusMark tone="error">
          <CloudOff aria-hidden />
        </StatusMark>
        <Headline>暂时无法连接身份服务</Headline>
        <Muted>{error}</Muted>
        <Button
          className="mt-1 justify-self-center"
          icon={<RefreshCw aria-hidden />}
          onPress={() => void retry()}
        >
          重试
        </Button>
      </div>
    </Stage>
  );
};

export const AdminShell = () => {
  const { isSubmitting, state } = useAuth();

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
      return <RouterProvider router={router} />;
  }
};
