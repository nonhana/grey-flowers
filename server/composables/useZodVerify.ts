import type { z } from 'zod'

export function useZodVerify<T extends z.ZodObject<any>>(schema: T, data: unknown) {
  const errorList: { field: keyof any, message: string }[] = []

  const verifyRes = schema.safeParse(data)

  if (!verifyRes.success) {
    verifyRes.error.format((err) => {
      errorList.push({
        field: err.path[0] || 'unknown',
        message: err.message,
      })
    })

    return { success: false, errorList } as const
  }

  return { success: true, result: verifyRes.data as z.infer<T> } as const
}
