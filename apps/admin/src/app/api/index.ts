import { createActivitiesApi } from './modules/activities';
import { createArticlesApi } from './modules/articles';
import { createAssetsApi } from './modules/assets';
import { createAuthApi } from './modules/auth';
import { createCommentsApi } from './modules/comments';
import { createMusicApi } from './modules/music';
import { createOverviewApi } from './modules/overview';
import { createTaxonomyApi } from './modules/taxonomy';
import { createUsersApi } from './modules/users';
import { createSession } from './session';
import { createTransport } from './transport';

export {
  ApiNetworkError,
  ApiRequestError,
  ApiResponseError,
  isAbortError,
  isApiNetworkError,
  isApiRequestError,
} from './errors';

let accessToken: string | null = null;

const getApiOrigin = () => {
  const origin = import.meta.env.VITE_API_ORIGIN as string;
  if (!origin) throw new Error('Admin API origin is unavailable.');
  return new URL(origin).toString();
};

export const getAccessToken = () => accessToken;

export const setAccessToken = (next: string | null) => {
  accessToken = next;
};

const createApiClient = () => {
  const prefixUrl = getApiOrigin();
  const transport = createTransport({ prefixUrl, getAccessToken });
  const session = createSession({ transport, getAccessToken, setAccessToken });

  return {
    activities: createActivitiesApi(session.auth),
    articles: createArticlesApi(session.auth),
    assets: createAssetsApi(session.auth),
    auth: createAuthApi({ auth: session.auth, open: transport.open }),
    comments: createCommentsApi(session.auth),
    music: createMusicApi(session.auth),
    overview: createOverviewApi(session.auth),
    taxonomy: createTaxonomyApi(session.auth),
    users: createUsersApi(session.auth),
    refresh: () => session.refresh(),
    setSessionExpiredHandler: session.setSessionExpiredHandler,
  };
};

export const apiClient = createApiClient();
