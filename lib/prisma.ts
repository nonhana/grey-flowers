import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '~/prisma/generated/client'
import env from '~/server/env/dotenv'

function prismaClientSingleton() {
  const connectionString = `${env.HANA_DATABASE_URL}`
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (env.NODE_ENV !== 'production')
  globalThis.prismaGlobal = prisma
