import type { ActivityItem } from '#shared/types/activity'

export type ActivityDetailStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error'

/** ofetch/FetchError 的 HTTP 状态；非对象或取不到时返回 undefined。 */
function getFetchStatus(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null)
    return undefined
  if ('response' in value && typeof value.response === 'object' && value.response !== null) {
    const status = (value.response as { status?: unknown }).status
    if (typeof status === 'number')
      return status
  }
  return undefined
}

export function useActivityDetail() {
  const item = ref<ActivityItem | null>(null)
  const error = ref<string | null>(null)
  const notFound = ref(false)
  let activeRequestId = 0

  function reset() {
    activeRequestId += 1
    item.value = null
    error.value = null
    notFound.value = false
  }

  async function fetchById(id: number): Promise<void> {
    const requestId = ++activeRequestId
    error.value = null
    notFound.value = false
    item.value = null

    try {
      const data = await $fetch('/api/activity/single', { query: { id } })

      if (requestId !== activeRequestId)
        return

      if (!data.success) {
        if (data.statusCode === 404)
          notFound.value = true
        else
          error.value = '动态详情加载失败，请稍后重试。'
        return
      }

      item.value = data.payload
    }
    catch (fetchError) {
      // S5 起上游 404 落在真实 HTTP 状态上，$fetch 会 reject 而不是 resolve 出
      // body：404 要按响应状态识别（与 [article].vue 的 getArticleFailStatus 同型），
      // 否则「未找到动态」会被误报成网络错误。
      if (requestId !== activeRequestId)
        return
      if (getFetchStatus(fetchError) === 404) {
        notFound.value = true
        return
      }
      console.error('[ActivityDetail] fetchById error:', fetchError)
      error.value = '动态详情加载失败，请检查网络连接。'
    }
  }

  return {
    item: shallowReadonly(item),
    error: shallowReadonly(error),
    notFound: shallowReadonly(notFound),
    fetchById,
    reset,
  }
}
