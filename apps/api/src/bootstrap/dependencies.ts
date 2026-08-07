import type { PrismaClient } from '@grey-flowers/db';

import { createPrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '../env.js';

import {
  R2ObjectStorage,
  type ObjectStorage,
} from '../adapters/object-storage/r2.js';
import { ActivityService } from '../modules/activities/service.js';
import { ArticleService } from '../modules/articles/service.js';
import { AssetService } from '../modules/assets/service.js';
import { AuthService } from '../modules/auth/service.js';
import { CommentMailer } from '../modules/comments/mailer.js';
import { CommentService } from '../modules/comments/service.js';
import { MusicService } from '../modules/music/service.js';
import { OverviewService } from '../modules/overview/service.js';
import { TaxonomyService } from '../modules/taxonomy/service.js';
import { UserService } from '../modules/users/service.js';
import { createLogger, type ApiLogger } from './logger.js';

export interface AppDependencies {
  activities: ActivityService;
  articles: ArticleService;
  assets: AssetService;
  auth: AuthService;
  comments: CommentService;
  environment: ApiEnvironment;
  logger: ApiLogger;
  music: MusicService;
  objectStorage: ObjectStorage;
  overview: OverviewService;
  prisma: PrismaClient;
  taxonomy: TaxonomyService;
  users: UserService;
}

export const createDependencies = (
  environment: ApiEnvironment,
): AppDependencies => {
  const prisma = createPrismaClient(environment.HANA_DATABASE_URL);
  const logger = createLogger(environment);
  const objectStorage = new R2ObjectStorage(environment);
  const taxonomy = new TaxonomyService(prisma, environment);
  const assets = new AssetService(prisma, environment, objectStorage);
  const auth = new AuthService(prisma, environment);
  const users = new UserService(prisma, auth);

  return {
    environment,
    logger,
    objectStorage,
    prisma,
    activities: new ActivityService(prisma, environment),
    articles: new ArticleService(prisma, environment, taxonomy),
    assets,
    auth,
    comments: new CommentService(
      prisma,
      logger,
      new CommentMailer(environment),
    ),
    music: new MusicService(prisma, environment, objectStorage, assets),
    overview: new OverviewService(prisma),
    taxonomy,
    users,
  };
};
