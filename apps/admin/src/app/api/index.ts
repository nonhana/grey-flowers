import { createActivitiesApi, type ActivitiesApi } from './activities.js';
import { createArticlesApi, type ArticlesApi } from './articles.js';
import { createAssetsApi, type AssetsApi } from './assets.js';
import { createAuthApi, type AuthApi } from './auth.js';
import { createCommentsApi, type CommentsApi } from './comments.js';
import { createHttp } from './http.js';
import { createMusicApi, type MusicApi } from './music.js';
import { createOverviewApi, type OverviewApi } from './overview.js';
import { createTaxonomyApi, type TaxonomyApi } from './taxonomy.js';
import { createUsersApi, type UsersApi } from './users.js';

export {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  isApiNetworkError,
  isApiRequestError,
} from './errors.js';

/**
 * 短命 access token 只驻留内存，不落 localStorage：
 * 刷新后 / 会话过期时凭 httpOnly refresh cookie（gf_refresh）重新换发。
 * 第三方脚本无法从持久化存储窃取令牌。
 */
let accessToken: string | null = null;

const getApiOrigin = () => {
  const origin = import.meta.env.VITE_API_ORIGIN as string;

  if (!origin) {
    throw new Error('Admin API origin is unavailable.');
  }

  return new URL(origin).toString();
};

export const getAccessToken = () => {
  return accessToken;
};

export const setAccessToken = (next: string | null) => {
  accessToken = next;
};

export class ApiClient {
  readonly activities: ActivitiesApi;
  readonly articles: ArticlesApi;
  readonly assets: AssetsApi;
  readonly auth: AuthApi;
  readonly comments: CommentsApi;
  readonly music: MusicApi;
  readonly overview: OverviewApi;
  readonly taxonomy: TaxonomyApi;
  readonly users: UsersApi;

  private readonly http = createHttp({
    prefixUrl: getApiOrigin(),
    getAccessToken,
    setAccessToken,
  });

  constructor() {
    this.activities = createActivitiesApi(this.http);
    this.articles = createArticlesApi(this.http);
    this.assets = createAssetsApi(this.http);
    this.auth = createAuthApi(this.http);
    this.comments = createCommentsApi(this.http);
    this.music = createMusicApi(this.http);
    this.overview = createOverviewApi(this.http);
    this.taxonomy = createTaxonomyApi(this.http);
    this.users = createUsersApi(this.http);
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
