import {
  type AuthLoginData,
  type AuthLoginInput,
  type AuthLogoutData,
  type AuthSessionData,
  authLoginResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
} from '@grey-flowers/contracts';

import type { Http } from './http.js';

export function createAuthApi(http: Http) {
  return {
    login: (input: AuthLoginInput): Promise<AuthLoginData> =>
      http.post('/auth/login', {
        json: input,
        schema: authLoginResponseSchema,
      }),
    logout: (): Promise<AuthLogoutData> =>
      http.post('/auth/logout', { schema: authLogoutResponseSchema }),
    session: (): Promise<AuthSessionData> =>
      http.get('/auth/session', {
        authenticated: true,
        schema: authSessionResponseSchema,
      }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
