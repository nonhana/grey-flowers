import type { ActivityItem } from '~/types/activity'
import { ref, shallowReadonly } from 'vue'

interface ActivityListErrorMessages {
  initialResponse: string
  initialException?: string
  loadMoreResponse?: string
  loadMoreException?: string
}

interface UseActivityListOptions {
  pageSize?: number
  errorMessages: ActivityListErrorMessages
}

type RequestPhase = 'initial' | 'loadMore'
type ErrorSource = 'response' | 'exception'

const DEFAULT_ACTIVITY_PAGE_SIZE = 20

function resolveActivityErrorMessage(
  messages: ActivityListErrorMessages,
  phase: RequestPhase,
  source: ErrorSource,
) {
  if (phase === 'initial')
    return source === 'exception' ? messages.initialException ?? messages.initialResponse : messages.initialResponse

  if (source === 'exception')
    return messages.loadMoreException ?? messages.initialException ?? messages.loadMoreResponse ?? messages.initialResponse

  return messages.loadMoreResponse ?? messages.initialResponse
}

export function useActivityList(options: UseActivityListOptions) {
  const pageSize = options.pageSize ?? DEFAULT_ACTIVITY_PAGE_SIZE

  const items = ref<ActivityItem[]>([])
  const page = ref(1)
  const hasMore = ref(true)
  const loadingInitial = ref(false)
  const loadingMore = ref(false)
  const initialError = ref<string | null>(null)
  const loadMoreError = ref<string | null>(null)

  let activeRequest: Promise<boolean> | null = null

  function reset() {
    items.value = []
    page.value = 1
    hasMore.value = true
    loadingInitial.value = false
    loadingMore.value = false
    initialError.value = null
    loadMoreError.value = null
  }

  function setPhaseError(phase: RequestPhase, source: ErrorSource) {
    const message = resolveActivityErrorMessage(options.errorMessages, phase, source)

    if (phase === 'initial') {
      initialError.value = message
      return
    }

    loadMoreError.value = message
  }

  function clearPhaseError(phase: RequestPhase) {
    if (phase === 'initial') {
      initialError.value = null
      return
    }

    loadMoreError.value = null
  }

  async function fetchNext() {
    if (activeRequest)
      return await activeRequest

    if (!hasMore.value)
      return false

    const phase: RequestPhase = items.value.length === 0 ? 'initial' : 'loadMore'

    if (phase === 'initial')
      loadingInitial.value = true
    else
      loadingMore.value = true

    clearPhaseError(phase)

    activeRequest = (async () => {
      try {
        const data = await $fetch('/api/activity/list', {
          query: {
            page: page.value,
            pageSize,
          },
        })

        if (!data.success) {
          setPhaseError(phase, 'response')
          return false
        }

        const list = Array.isArray(data.payload) ? data.payload : []
        items.value = [...items.value, ...list]

        if (list.length < pageSize)
          hasMore.value = false
        else
          page.value += 1

        return true
      }
      catch (error) {
        console.error(`[ActivityList] fetchNext ${phase} error:`, error)
        setPhaseError(phase, 'exception')
        return false
      }
      finally {
        if (phase === 'initial')
          loadingInitial.value = false
        else
          loadingMore.value = false

        activeRequest = null
      }
    })()

    return await activeRequest
  }

  async function retryInitial() {
    if (loadingInitial.value || loadingMore.value)
      return activeRequest ? await activeRequest : false

    reset()
    return await fetchNext()
  }

  async function retryLoadMore() {
    if (items.value.length === 0)
      return await retryInitial()

    if (activeRequest)
      return await activeRequest

    loadMoreError.value = null
    return await fetchNext()
  }

  async function ensureItemLoaded(id: number) {
    if (items.value.some(item => item.id === id))
      return true

    while (hasMore.value && !items.value.some(item => item.id === id)) {
      const loaded = await fetchNext()
      if (!loaded)
        break
    }

    return items.value.some(item => item.id === id)
  }

  return {
    items: shallowReadonly(items),
    page: shallowReadonly(page),
    hasMore: shallowReadonly(hasMore),
    loadingInitial: shallowReadonly(loadingInitial),
    loadingMore: shallowReadonly(loadingMore),
    initialError: shallowReadonly(initialError),
    loadMoreError: shallowReadonly(loadMoreError),
    fetchNext,
    retryInitial,
    retryLoadMore,
    ensureItemLoaded,
    reset,
  }
}
