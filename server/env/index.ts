import process from 'node:process'
import { config } from 'dotenv'
import z from 'zod'

config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  HANA_DATABASE_URL: z.string(),
  HANA_JWT_SECRET: z.string(),
  HANA_MAIL_ENABLE: z.enum(['true', 'false']),
  RESEND_API_KEY: z.string(),
  RESEND_FROM: z.string(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('环境变量配置错误')
  console.error(z.treeifyError(parsedEnv.error).errors)
  process.exit(1) // 配置错误，启动阶段即退出
}

const env = parsedEnv.data
export default env
