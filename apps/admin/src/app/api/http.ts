import {
  apiFailureSchema,
  authRefreshResponseSchema,
  type AuthRefreshData,
} from '@grey-flowers/contracts';
import ky, { type KyInstance } from 'ky';

import {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  isApiRequestError,
} from './errors.js';

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
  body?: FormData;
  json?: unknown;
  /** 0..1 上传进度；仅对 FormData 上传生效 */
  onUploadProgress?: (progress: number) => void;
  retryOnAuthRequired?: boolean;
  schema: TSchema;
  searchParams?: URLSearchParams;
}

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

export function createHttp(options: HttpOptions) {
  const api = ky.create({
    prefix: options.prefixUrl,
    credentials: 'include',
    retry: 0,
    throwHttpErrors: false,
  });

  let refreshPromise: Promise<AuthRefreshData> | undefined;
  let sessionExpiredHandler: (() => void) | undefined;

  function setSessionExpiredHandler(handler: () => void) {
    sessionExpiredHandler = handler;
  }

  function expireAccess() {
    options.setAccessToken(null);
    sessionExpiredHandler?.();
  }

  async function send<TSchema extends ResponseSchema<unknown>>(
    method: HttpMethod,
    path: string,
    requestOptions: HttpRequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>> {
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

    let response: Response;

    try {
      response = await api[method](path, {
        ...(requestOptions.body === undefined
          ? {}
          : { body: requestOptions.body }),
        ...(requestOptions.json === undefined
          ? {}
          : { json: requestOptions.json }),
        headers: requestOptions.authenticated
          ? { Authorization: `Bearer ${options.getAccessToken()}` }
          : undefined,
        ...(requestOptions.onUploadProgress === undefined
          ? {}
          : {
              onUploadProgress(requestProgress: { percent: number }) {
                requestOptions.onUploadProgress?.(requestProgress.percent);
              },
            }),
        searchParams: requestOptions.searchParams,
      });
    } catch (error) {
      throw new ApiNetworkError(error);
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
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
  }

  function refresh(): Promise<AuthRefreshData> {
    return send('post', '/auth/refresh', {
      schema: authRefreshResponseSchema,
    });
  }

  async function refreshOnce() {
    if (!refreshPromise) {
      refreshPromise = refresh().finally(() => {
        refreshPromise = undefined;
      });
    }

    return refreshPromise.then((response) => {
      options.setAccessToken(response.accessToken);
      return response;
    });
  }

  /**
   * 上传专用通道：fetch 对 FormData 无上传进度，ky 会为进度把 body 包成流
   * （在部分环境下跨域流式 POST 触发 ALPN 失败），因此上传走 XHR + 原生
   * upload.onprogress，保留相同的 envelope 解码与 AUTH_REQUIRED 重试语义。
   */
  function uploadOnce<TSchema extends ResponseSchema<unknown>>(
    path: string,
    requestOptions: HttpRequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>> {
    const { promise, reject, resolve } =
      Promise.withResolvers<ResponseData<TSchema>>();

    if (requestOptions.authenticated && !options.getAccessToken()) {
      reject(
        new ApiRequestError(
          {
            success: false,
            error: {
              code: 'AUTH_REQUIRED',
              message: LOCAL_AUTH_REQUIRED_MESSAGE,
            },
            requestId: '',
          },
          401,
        ),
      );
      return promise;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', new URL(path, options.prefixUrl).toString());
    xhr.withCredentials = true;

    if (requestOptions.authenticated) {
      xhr.setRequestHeader(
        'Authorization',
        `Bearer ${options.getAccessToken()}`,
      );
    }

    if (requestOptions.onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          requestOptions.onUploadProgress?.(event.loaded / event.total);
        }
      };
    }

    xhr.onerror = () => reject(new ApiNetworkError('Upload request failed'));
    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new ApiResponseError());
        return;
      }

      const parsed = requestOptions.schema.safeParse(body);
      if (parsed.success) {
        resolve(parsed.data.data as ResponseData<TSchema>);
        return;
      }

      const failure = apiFailureSchema.safeParse(body);
      if (failure.success) {
        reject(new ApiRequestError(failure.data, xhr.status));
        return;
      }

      reject(new ApiResponseError());
    };

    xhr.send(requestOptions.body);
    return promise;
  }

  async function upload<TSchema extends ResponseSchema<unknown>>(
    path: string,
    requestOptions: HttpRequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>> {
    try {
      return await uploadOnce(path, requestOptions);
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

        try {
          return await uploadOnce(path, {
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
  }

  async function request<TSchema extends ResponseSchema<unknown>>(
    method: HttpMethod,
    path: string,
    requestOptions: HttpRequestOptions<TSchema>,
  ): Promise<ResponseData<TSchema>> {
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
  }

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
    upload,
  };
}

export type Http = ReturnType<typeof createHttp>;
