import type { Principal } from '@grey-flowers/contracts';

import type { AppDependencies } from '../../bootstrap/dependencies.js';

interface PublicUserFields {
  avatar: string;
  email: string;
  id: number;
  role: 'USER' | 'ADMIN';
  site: string | null;
  username: string;
}

export const toPrincipal = (
  user: PublicUserFields,
  sessionId: string,
): Principal => {
  return {
    userId: user.id,
    sessionId,
    role: user.role,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    site: user.site,
  };
};

export const findActivePrincipal = async (
  dependencies: AppDependencies,
  userId: number,
  sessionId: string,
): Promise<Principal | undefined> => {
  const session = await dependencies.prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          site: true,
          role: true,
        },
      },
    },
  });

  return session ? toPrincipal(session.user, session.id) : undefined;
};
