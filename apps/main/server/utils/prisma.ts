import { createPrismaClient } from '@grey-flowers/db'
import env from '#server/env'

const prisma = createPrismaClient(env.HANA_DATABASE_URL)

export default prisma
