import { z } from 'zod'

/** 浏览器 ↔ main server 的 legacy 信封协议：形状单点定义，server 产出与浏览器消费共用。 */
export const legacyEnvelopeSchema = z.object({
  statusCode: z.number().int(),
  statusMessage: z.string(),
  success: z.boolean(),
  payload: z.unknown(),
  error: z.unknown(),
})

/** T 为业务载荷类型；payload 归一后恒可为 null。 */
export type LegacyEnvelope<T = unknown> = Omit<z.infer<typeof legacyEnvelopeSchema>, 'payload'> & { payload: T | null }
