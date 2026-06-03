import type { OverlayNavigationMode } from '~/composables/useOverlayNavigation'

interface OverlayStackEntry {
  id: string
  navigationMode: OverlayNavigationMode
  close: () => void
}

const OVERLAY_HISTORY_STATE_KEY = '__hanaOverlayId'

export const useDialogStore = defineStore('dialog', () => {
  const overlayStack = shallowRef<OverlayStackEntry[]>([])
  const ignoredPopstateCount = ref(0)
  const popstateClosingIds = shallowRef(new Set<string>())
  const dialogCount = computed(() => overlayStack.value.length)

  let popstateBound = false

  function getDialogCount() {
    return dialogCount.value
  }

  function registerOverlay(entry: OverlayStackEntry) {
    if (overlayStack.value.some(item => item.id === entry.id))
      return

    overlayStack.value = [...overlayStack.value, entry]
  }

  function unregisterOverlay(id: string) {
    overlayStack.value = overlayStack.value.filter(item => item.id !== id)
    popstateClosingIds.value.delete(id)
  }

  function getOverlayIndex(id: string) {
    return overlayStack.value.findIndex(item => item.id === id)
  }

  function isTopOverlay(id: string) {
    return overlayStack.value.at(-1)?.id === id
  }

  function getTopOverlay() {
    return overlayStack.value.at(-1) ?? null
  }

  function getCurrentHistoryOverlayId() {
    if (typeof window === 'undefined')
      return null

    const state = window.history.state
    if (!state || typeof state !== 'object')
      return null

    const overlayId = Reflect.get(state, OVERLAY_HISTORY_STATE_KEY)
    return typeof overlayId === 'string' ? overlayId : null
  }

  function pushOverlayHistory(id: string) {
    if (typeof window === 'undefined')
      return

    const currentState = window.history.state
    const baseState = currentState && typeof currentState === 'object'
      ? currentState
      : {}

    window.history.pushState({
      ...baseState,
      [OVERLAY_HISTORY_STATE_KEY]: id,
    }, '', window.location.href)
  }

  function ignoreNextPopstate() {
    ignoredPopstateCount.value += 1
  }

  function shouldCleanupHistoryOnClose(id: string, navigationMode: OverlayNavigationMode) {
    if (navigationMode !== 'history')
      return false

    if (popstateClosingIds.value.has(id)) {
      popstateClosingIds.value.delete(id)
      return false
    }

    return getCurrentHistoryOverlayId() === id
  }

  function cleanupOverlayHistory() {
    if (typeof window === 'undefined')
      return

    ignoreNextPopstate()
    window.history.back()
  }

  function closeTopOverlayFromPopstate() {
    const topOverlay = getTopOverlay()
    if (!topOverlay || topOverlay.navigationMode !== 'history')
      return

    popstateClosingIds.value.add(topOverlay.id)
    topOverlay.close()
  }

  function handlePopstate() {
    if (ignoredPopstateCount.value > 0) {
      ignoredPopstateCount.value -= 1
      return
    }

    closeTopOverlayFromPopstate()
  }

  function ensurePopstateListener() {
    if (popstateBound || typeof window === 'undefined')
      return

    window.addEventListener('popstate', handlePopstate)
    popstateBound = true
  }

  return {
    dialogCount,
    overlayStack,
    getDialogCount,
    registerOverlay,
    unregisterOverlay,
    getOverlayIndex,
    isTopOverlay,
    getTopOverlay,
    getCurrentHistoryOverlayId,
    pushOverlayHistory,
    shouldCleanupHistoryOnClose,
    cleanupOverlayHistory,
    ensurePopstateListener,
  }
})
