import { createArticlesApi, type ArticlesApi } from './articles.js';
import { createAssetsApi, type AssetsApi } from './assets.js';
import { createAuthApi, type AuthApi } from './auth.js';
import { createHttp } from './http.js';
import { createTaxonomyApi, type TaxonomyApi } from './taxonomy.js';

export {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  isApiNetworkError,
  isApiRequestError,
} from './errors.js';

export const ACCESS_TOKEN_KEY = 'gf.access_token';

const getApiOrigin = () => {
  const origin = import.meta.env.VITE_API_ORIGIN as string;

  if (!origin) {
    throw new Error('Admin API origin is unavailable.');
  }

  return new URL(origin).toString();
};

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (accessToken: string | null) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export class ApiClient {
  readonly articles: ArticlesApi;
  readonly assets: AssetsApi;
  readonly auth: AuthApi;
  readonly taxonomy: TaxonomyApi;

  private readonly http = createHttp({
    prefixUrl: getApiOrigin(),
    getAccessToken,
    setAccessToken,
  });

  constructor() {
    this.articles = createArticlesApi(this.http);
    this.assets = createAssetsApi(this.http);
    this.auth = createAuthApi(this.http);
    this.taxonomy = createTaxonomyApi(this.http);
  }

  /** transport 凭据续期（refresh 属于 transport，见 D5） */
  refresh() {
    return this.http.refresh();
  }

  /** React 侧只通过这里订阅会话过期；核心保持框架无关（D4） */
  setSessionExpiredHandler(handler: () => void) {
    this.http.setSessionExpiredHandler(handler);
  }
}

export const apiClient = new ApiClient();
