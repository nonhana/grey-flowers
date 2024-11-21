import process from 'node:process'
import { PrismaSessionStore } from '@quixo3/prisma-session-store'
import session from 'express-session'
import prisma from '~/lib/prisma'
import env from '~/server/env/dotenv'

const expressSessionMiddleware = session({
  secret: env.HANA_SESSION_KEY as string,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: true,
  }),
}) as any

export default fromNodeMiddleware(expressSessionMiddleware)
