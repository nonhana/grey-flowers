import { createActivitiesApi, type ActivitiesApi } from './activities';
import { createArticlesApi, type ArticlesApi } from './articles';
import { createAssetsApi, type AssetsApi } from './assets';
import { createAuthApi, type AuthApi } from './auth';
import { createCommentsApi, type CommentsApi } from './comments';
import { createHttp } from './http';
import { createMusicApi, type MusicApi } from './music';
import { createOverviewApi, type OverviewApi } from './overview';
import { createTaxonomyApi, type TaxonomyApi } from './taxonomy';
import { createUsersApi, type UsersApi } from './users';

export {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  isApiNetworkError,
  isApiRequestError,
} from './errors';

let accessToken: string | null = null;

const getApiOrigin = () => {
  const origin = import.meta.env.VITE_API_ORIGIN as string;

  if (!origin) {
    throw new Error('Admin API origin is unavailable.');
  }

  return new URL(origin).toString();
};

export const getAccessToken = () => accessToken;

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

  refresh() {
    return this.http.refresh();
  }

  setSessionExpiredHandler(handler: () => void) {
    this.http.setSessionExpiredHandler(handler);
  }
}

export const apiClient = new ApiClient();
