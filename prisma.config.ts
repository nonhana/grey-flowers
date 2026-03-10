import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('HANA_DATABASE_URL'),
  },
})
