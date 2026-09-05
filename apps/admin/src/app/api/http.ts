import {
  apiFailureSchema,
  authRefreshResponseSchema,
  type AuthRefreshData,
} from '@grey-flowers/contracts';
import ky from 'ky';

import { readApiDelayMs } from './delay';
import {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  isApiRequestError,
} from './errors';

const LOCAL_AUTH_REQUIRED_MESSAGE = '需要重新登录。';

export interface HttpOptions {
  prefixUrl: string;
  getAccessToken: () => string | null;
  setAccessToken: (accessToken: string | null) => void;
}

/** contracts 的 response envelope schema 的结构鸭子类型 */
interface ResponseSchema<TData> {
  safeParse: (
    value: unknown,
  ) => { success: true; data: { data: TData } } | { success: false };
}

type ResponseData<TSchema> =
  TSchema extends ResponseSchema<infer TData> ? TData : never;

export interface HttpRequestOptions<
  TSchema extends ResponseSchema<unknown>,
> extends Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'> {
  authenticated?: boolean;
  json?: unknown;
  retryOnAuthRequired?: boolean;
  schema: TSchema;
  searchParams?: URLSearchParams;
  signal?: AbortSignal;
}

/** 只读请求的可选项（Query 取消走这里）。 */
export interface HttpReadOptions {
  signal?: AbortSignal;
}

const abortError = () =>
  new DOMException('The operation was aborted.', 'AbortError');

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/** 取消不是网络故障：原样上抛，Query 据此静默结算，不进入页面错误态。 */
const rethrowIfAborted = (error: unknown, signal: AbortSignal | undefined) => {
  if (isAbortError(error) || signal?.aborted) {
    throw isAbortError(error) ? error : abortError();
  }
};

/** 调试延迟尊重取消：abort 时立即结束，不留挂起的 setTimeout。 */
const delay = (ms: number, signal: AbortSignal | undefined) => {
  if (signal?.aborted) return Promise.reject(abortError());

  const { promise, reject, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, ms);
  const onAbort = () => {
    clearTimeout(timer);
    reject(abortError());
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  // 落定后（正常完成或 abort）都摘掉监听（L-2），不留对 signal 的引用。
  return promise.finally(() => {
    signal?.removeEventListener('abort', onAbort);
  });
};

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

export const createHttp = (options: HttpOptions) => {
  const api = ky.create({
    prefix: options.prefixUrl,
    credentials: 'include',
    retry: 0,
    throwHttpErrors: false,
  });

  let refreshPromise: Promise<AuthRefreshData> | undefined;
  let sessionExpiredHandler: (() => void) | undefined;

  const setSessionExpiredHandler = (handler: () => void) => {
    sessionExpiredHandler = handler;
  };

  const expireAccess = () => {
    options.setAccessToken(null);
    sessionExpiredHandler?.();
  };

  const send = async <TSchema extends ResponseSchema<unknown>>(
    method: HttpMethod,
    path: string,
    requestOptions: HttpRequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>> => {
    if (requestOptions.authenticated) {
      const accessToken = options.getAccessToken();

      if (!accessToken) {
        throw new ApiRequestError(
          {
            success: false,
            error: {
              code: 'AUTH_REQUIRED',
              message: LOCAL_AUTH_REQUIRED_MESSAGE,
            },
            requestId: '',
          },
          401,
        );
      }
    }

    // 调试：统一延迟（0 时不引入任何开销）。每次请求前读，改完即生效。
    const delayMs = readApiDelayMs();
    if (delayMs > 0) {
      await delay(delayMs, requestOptions.signal);
    }

    let response: Response;

    try {
      response = await api[method](path, {
        ...(requestOptions.json === undefined
          ? {}
          : { json: requestOptions.json }),
        headers: requestOptions.authenticated
          ? { Authorization: `Bearer ${options.getAccessToken()}` }
          : undefined,
        searchParams: requestOptions.searchParams,
        signal: requestOptions.signal,
      });
    } catch (error) {
      rethrowIfAborted(error, requestOptions.signal);
      throw new ApiNetworkError(error);
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch (error) {
      rethrowIfAborted(error, requestOptions.signal);
      throw new ApiResponseError();
    }

    const parsed = requestOptions.schema.safeParse(body);

    if (parsed.success) {
      return parsed.data.data as ResponseData<TSchema>;
    }

    const failure = apiFailureSchema.safeParse(body);

    if (failure.success) {
      throw new ApiRequestError(failure.data, response.status);
    }

    throw new ApiResponseError();
  };

  const refresh = (): Promise<AuthRefreshData> => {
    return send('post', '/auth/refresh', {
      schema: authRefreshResponseSchema,
    });
  };

  const refreshOnce = async () => {
    if (!refreshPromise) {
      refreshPromise = refresh().finally(() => {
        refreshPromise = undefined;
      });
    }

    return refreshPromise.then((response) => {
      options.setAccessToken(response.accessToken);
      return response;
    });
  };

  /**
   * 直传通道：向 presigned URL PUT 文件本体（无 envelope、无鉴权头）。
   * Content-Type 必须与 presign 声明一致，R2 以此落对象的 ContentType。
   * 进度为浏览器真实发送进度，100% 即 R2 接收完成。
   */
  const putUpload = (
    url: string,
    body: Blob,
    contentType: string,
    onUploadProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const { promise, reject, resolve } = Promise.withResolvers<void>();

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);

    if (onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onUploadProgress(event.loaded / event.total);
        }
      };
    }

    xhr.onerror = () => reject(new ApiNetworkError('Upload request failed'));
    // 取消口径与 rethrowIfAborted 一致：AbortError 形态上抛，不伪装成网络错误。
    xhr.onabort = () => reject(abortError());
    xhr.onload = () => {
      // 2xx 即接收完成；R2 错误响应体为 XML，统一归一为网络错误。
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new ApiNetworkError(`Upload failed with status ${xhr.status}`));
      }
    };

    // 监听挂接前已取消：直接以取消形态失败，不发请求。
    if (signal?.aborted) {
      reject(abortError());
      return promise;
    }
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(body);
    return promise;
  };

  const request = async <TSchema extends ResponseSchema<unknown>>(
    method: HttpMethod,
    path: string,
    requestOptions: HttpRequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>> => {
    try {
      return await send(method, path, requestOptions);
    } catch (error) {
      if (
        requestOptions.authenticated &&
        requestOptions.retryOnAuthRequired !== false &&
        isApiRequestError(error, 'AUTH_REQUIRED')
      ) {
        try {
          await refreshOnce();
        } catch {
          expireAccess();
          throw error;
        }

        // refresh 是共享 promise，不随单个 caller 取消；恢复后若调用方已取消，放弃重试。
        if (requestOptions.signal?.aborted) {
          throw abortError();
        }

        try {
          return await request(method, path, {
            ...requestOptions,
            retryOnAuthRequired: false,
          });
        } catch (retryError) {
          if (isApiRequestError(retryError, 'AUTH_REQUIRED')) {
            expireAccess();
          }

          throw retryError;
        }
      }

      throw error;
    }
  };

  return {
    get: <TSchema extends ResponseSchema<unknown>>(
      path: string,
      requestOptions: HttpRequestOptions<TSchema>,
    ) => request('get', path, requestOptions),
    post: <TSchema extends ResponseSchema<unknown>>(
      path: string,
      requestOptions: HttpRequestOptions<TSchema>,
    ) => request('post', path, requestOptions),
    patch: <TSchema extends ResponseSchema<unknown>>(
      path: string,
      requestOptions: HttpRequestOptions<TSchema>,
    ) => request('patch', path, requestOptions),
    delete: <TSchema extends ResponseSchema<unknown>>(
      path: string,
      requestOptions: HttpRequestOptions<TSchema>,
    ) => request('delete', path, requestOptions),
    refresh,
    setSessionExpiredHandler,
    putUpload,
  };
};

export type Http = ReturnType<typeof createHttp>;
