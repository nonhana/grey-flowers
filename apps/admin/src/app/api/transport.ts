import type {
  Options,
  StandardSchemaV1,
  StandardSchemaV1InferOutput,
} from 'ky';

import { apiErrorStatus, apiFailureSchema } from '@grey-flowers/contracts';
import ky from 'ky';

import { readApiDelayMs } from './delay';
import {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  abortError,
  isAbortError,
} from './errors';

type ApiSchema<TData> = StandardSchemaV1<unknown, { data: TData }>;

type ResponseData<TSchema extends ApiSchema<unknown>> =
  StandardSchemaV1InferOutput<TSchema> extends { data: infer TData }
    ? TData
    : never;

type HttpRequestOptions = Omit<
  Options,
  | 'baseUrl'
  | 'credentials'
  | 'headers'
  | 'method'
  | 'prefix'
  | 'retry'
  | 'throwHttpErrors'
>;

/** 唯一事实源：支持的 HTTP method 清单，类型与运行时同源。 */
const HTTP_METHODS = ['get', 'post', 'patch', 'delete'] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

export type Dispatcher = <TSchema extends ApiSchema<unknown>>(
  method: HttpMethod,
  path: string,
  schema: TSchema,
  requestOptions: HttpRequestOptions,
) => Promise<ResponseData<TSchema>>;

const bind =
  (dispatch: Dispatcher, method: HttpMethod) =>
  <TSchema extends ApiSchema<unknown>>(
    path: string,
    schema: TSchema,
    requestOptions?: HttpRequestOptions,
  ) =>
    dispatch(method, path, schema, requestOptions ?? {});

export const channelOf = (dispatch: Dispatcher) => ({
  get: bind(dispatch, 'get'),
  post: bind(dispatch, 'post'),
  patch: bind(dispatch, 'patch'),
  delete: bind(dispatch, 'delete'),
});

export type Channel = ReturnType<typeof channelOf>;

const delay = async (ms: number, signal: AbortSignal | null | undefined) => {
  if (signal?.aborted) return Promise.reject(abortError());

  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, ms);
  const onAbort = () => {
    clearTimeout(timer);
    reject(abortError());
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  return promise.finally(() => signal?.removeEventListener('abort', onAbort));
};

const rethrowIfAborted = (
  error: unknown,
  signal: AbortSignal | null | undefined,
) => {
  if (isAbortError(error) || signal?.aborted) {
    throw isAbortError(error) ? error : abortError();
  }
};

interface TransportOptions {
  prefixUrl: string;
  getAccessToken: () => string | null;
}

export const createTransport = (options: TransportOptions) => {
  const api = ky.create({
    prefix: options.prefixUrl,
    credentials: 'include',
    retry: 0,
    throwHttpErrors: false,
  });

  const send = async <TSchema extends ApiSchema<unknown>>(
    authenticated: boolean,
    method: HttpMethod,
    path: string,
    schema: TSchema,
    requestOptions: HttpRequestOptions,
  ): Promise<ResponseData<TSchema>> => {
    if (authenticated && !options.getAccessToken()) {
      throw new ApiRequestError(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: '请重新登录。',
          },
          requestId: '',
        },
        apiErrorStatus.AUTH_REQUIRED,
      );
    }

    const delayMs = readApiDelayMs();
    if (delayMs > 0) await delay(delayMs, requestOptions.signal);

    let response: Response;

    try {
      response = await api[method](path, {
        ...requestOptions,
        ...(authenticated
          ? { headers: { Authorization: `Bearer ${options.getAccessToken()}` } }
          : {}),
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

    const validated = await schema['~standard'].validate(body);

    if (validated.issues === undefined) {
      return validated.value.data as ResponseData<TSchema>;
    }

    const failure = apiFailureSchema.safeParse(body);

    if (failure.success) {
      throw new ApiRequestError(failure.data, response.status);
    }

    throw new ApiResponseError();
  };

  return {
    send,
    open: channelOf((...args) => send(false, ...args)),
  };
};

export type Transport = ReturnType<typeof createTransport>;
