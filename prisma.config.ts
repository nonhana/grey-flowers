import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { defineConfig, env } from 'prisma/config'

if (existsSync('.env'))
  loadEnvFile()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('HANA_DATABASE_URL'),
  },
})
