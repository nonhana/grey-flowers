import type { PrismaClient } from '@grey-flowers/db';

import { createPrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '../env';

import {
  R2ObjectStorage,
  type ObjectStorage,
} from '../adapters/object-storage/r2';
import { ActivityService } from '../modules/activities/service';
import { ArticleService } from '../modules/articles/service';
import { AssetService } from '../modules/assets/service';
import { AuthService } from '../modules/auth/service';
import { CommentMailer } from '../modules/comments/mailer';
import { CommentService } from '../modules/comments/service';
import { FriendsService } from '../modules/friends/service';
import { MusicService } from '../modules/music/service';
import { OverviewService } from '../modules/overview/service';
import { TaxonomyService } from '../modules/taxonomy/service';
import { UserService } from '../modules/users/service';
import { WorksService } from '../modules/works/service';
import { createLogger, type ApiLogger } from './logger';

export interface AppDependencies {
  activities: ActivityService;
  articles: ArticleService;
  assets: AssetService;
  auth: AuthService;
  comments: CommentService;
  environment: ApiEnvironment;
  friends: FriendsService;
  logger: ApiLogger;
  music: MusicService;
  objectStorage: ObjectStorage;
  overview: OverviewService;
  prisma: PrismaClient;
  taxonomy: TaxonomyService;
  users: UserService;
  works: WorksService;
}

export const createDependencies = (
  environment: ApiEnvironment,
): AppDependencies => {
  const prisma = createPrismaClient(environment.HANA_DATABASE_URL);
  const logger = createLogger(environment);
  const objectStorage = new R2ObjectStorage(environment);
  const taxonomy = new TaxonomyService(prisma, environment);
  const assets = new AssetService(prisma, environment, objectStorage, logger);
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
    friends: new FriendsService(prisma),
    music: new MusicService(prisma, environment),
    overview: new OverviewService(prisma),
    taxonomy,
    users,
    works: new WorksService(
      prisma,
      objectStorage,
      environment.ASSET_PUBLIC_URL,
    ),
  };
};
