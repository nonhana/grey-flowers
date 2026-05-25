import type { ActivityItem } from '~/types/activity'

export type ActivityDetailStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error'

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
      console.error('[ActivityDetail] fetchById error:', fetchError)
      if (requestId !== activeRequestId)
        return
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
