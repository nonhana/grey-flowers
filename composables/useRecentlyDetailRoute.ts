import type { Ref } from 'vue'
import type { ActivityDetailStatus } from '~/composables/useActivityDetail'
import type { ActivityItem } from '~/types/activity'

interface Options {
  activities: Readonly<Ref<ReadonlyArray<ActivityItem>>>
  ensureItemLoaded: (id: number) => Promise<boolean>
}

function parseActivityId(value: unknown): number | null {
  if (value == null || value === '')
    return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function useRecentlyDetailRoute(options: Options) {
  const route = useRoute()
  const router = useRouter()

  const {
    item: detailActivity,
    error: detailErrorMessage,
    notFound: detailNotFound,
    fetchById,
    reset: resetDetail,
  } = useActivityDetail()

  const curActivityId = ref<number | null>(null)
  let locateSessionId = 0

  const listedActivity = computed(() =>
    options.activities.value.find(item => item.id === curActivityId.value),
  )
  const resolvedActivity = computed<ActivityItem | undefined>(() =>
    listedActivity.value ?? detailActivity.value ?? undefined,
  )

  const detailStatus = computed<ActivityDetailStatus>(() => {
    if (curActivityId.value === null)
      return 'idle'
    if (resolvedActivity.value)
      return 'ready'
    if (detailNotFound.value)
      return 'notFound'
    if (detailErrorMessage.value)
      return 'error'
    return 'loading'
  })

  const dialogVisible = computed<boolean>({
    get: () => curActivityId.value !== null,
    set: (next) => {
      if (next || curActivityId.value === null)
        return
      const nextQuery = { ...route.query }
      delete nextQuery.id
      router.replace({ query: nextQuery })
    },
  })

  function resetCurrent() {
    locateSessionId += 1
    curActivityId.value = null
    resetDetail()
  }

  async function locateActivityInList(id: number, sessionId: number) {
    const found = await options.ensureItemLoaded(id)
    if (sessionId !== locateSessionId || curActivityId.value !== id)
      return
    if (!found)
      return

    await nextTick()
    if (sessionId !== locateSessionId || curActivityId.value !== id)
      return

    const target = document.querySelector<HTMLElement>(`[data-recently-activity-id="${id}"]`)
    scrollToElementInWrapper(target)
  }

  async function openActivityById(id: number) {
    const sessionId = ++locateSessionId
    curActivityId.value = id
    void fetchById(id)
    void locateActivityInList(id, sessionId)
  }

  async function retryDetail() {
    if (curActivityId.value !== null)
      await openActivityById(curActivityId.value)
  }

  async function activateFromCurrentRoute() {
    const initialId = parseActivityId(route.query.id)
    if (initialId === null)
      return false
    await openActivityById(initialId)
    return true
  }

  watch(() => route.query.id, (newId) => {
    const nextId = parseActivityId(newId)
    if (nextId === null) {
      resetCurrent()
      return
    }
    if (nextId === curActivityId.value)
      return
    void openActivityById(nextId)
  })

  return {
    dialogVisible,
    detailStatus,
    resolvedActivity,
    detailErrorMessage,
    curActivityId,
    activateFromCurrentRoute,
    retryDetail,
  }
}
