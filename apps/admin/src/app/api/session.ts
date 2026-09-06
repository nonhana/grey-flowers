import type { AuthRefreshData } from '@grey-flowers/contracts';

import { authRefreshResponseSchema } from '@grey-flowers/contracts';

import { abortError, isApiRequestError } from './errors';
import { channelOf, type Dispatcher, type Transport } from './transport';

export interface SessionOptions {
  transport: Transport;
  getAccessToken: () => string | null;
  setAccessToken: (accessToken: string | null) => void;
}

export const createSession = (options: SessionOptions) => {
  const { transport } = options;

  let refreshPromise: Promise<AuthRefreshData> | undefined;
  let sessionExpiredHandler: (() => void) | undefined;

  const setSessionExpiredHandler = (handler: () => void) => {
    sessionExpiredHandler = handler;
  };

  const refresh = (): Promise<AuthRefreshData> =>
    transport.send(
      false,
      'post',
      '/auth/refresh',
      authRefreshResponseSchema,
      {},
    );

  const refreshOnce = async () => {
    if (!refreshPromise) {
      refreshPromise = refresh().finally(() => {
        refreshPromise = undefined;
      });
    }

    return refreshPromise.then((res) => {
      options.setAccessToken(res.accessToken);
      return res;
    });
  };

  const expireAccess = () => {
    options.setAccessToken(null);
    sessionExpiredHandler?.();
  };

  const request: Dispatcher = async (method, path, schema, requestOptions) => {
    try {
      return await transport.send(true, method, path, schema, requestOptions);
    } catch (error) {
      if (!isApiRequestError(error, 'AUTH_REQUIRED')) {
        throw error;
      }

      try {
        await refreshOnce();
      } catch {
        expireAccess();
        throw error;
      }

      if (requestOptions.signal?.aborted) {
        throw abortError();
      }

      try {
        return await transport.send(true, method, path, schema, requestOptions);
      } catch (retryError) {
        if (isApiRequestError(retryError, 'AUTH_REQUIRED')) {
          expireAccess();
        }

        throw retryError;
      }
    }
  };

  return {
    refresh,
    setSessionExpiredHandler,
    auth: channelOf(request),
  };
};
