import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '~/prisma/generated/client'
import env from '~/server/env'

const connectionString = `${env.HANA_DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma
