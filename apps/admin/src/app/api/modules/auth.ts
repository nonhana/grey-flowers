import {
  type AuthLoginInput,
  authLoginResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

export const createAuthApi = ({
  auth,
  open,
}: {
  auth: Channel;
  open: Channel;
}) => ({
  login: (input: AuthLoginInput) =>
    open.post('/auth/login', authLoginResponseSchema, { json: input }),
  logout: () => open.post('/auth/logout', authLogoutResponseSchema),
  session: () => auth.get('/auth/session', authSessionResponseSchema),
});

export type AuthApi = ReturnType<typeof createAuthApi>;
