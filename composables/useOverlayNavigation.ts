import type { ComputedRef, Ref } from 'vue'
import { useStore } from '~/store'

export type OverlayNavigationMode = 'history' | 'route'

interface UseOverlayNavigationOptions {
  visible: Ref<boolean> | ComputedRef<boolean>
  navigationMode: Ref<OverlayNavigationMode> | ComputedRef<OverlayNavigationMode>
  close: () => void
}

let overlayIdSeed = 0

export function useOverlayNavigation(options: UseOverlayNavigationOptions) {
  const { dialogStore } = useStore()
  const overlayId = `hana-overlay-${++overlayIdSeed}`
  const registered = ref(false)

  const overlayIndex = computed(() => {
    const index = dialogStore.getOverlayIndex(overlayId)
    return index === -1 ? dialogStore.getDialogCount() : index
  })

  const isTopOverlay = computed(() => dialogStore.isTopOverlay(overlayId))

  function registerVisibleOverlay() {
    if (registered.value)
      return

    const navigationMode = options.navigationMode.value

    dialogStore.ensurePopstateListener()
    dialogStore.registerOverlay({
      id: overlayId,
      navigationMode,
      close: options.close,
    })

    registered.value = true

    if (navigationMode === 'history')
      dialogStore.pushOverlayHistory(overlayId)
  }

  function unregisterVisibleOverlay(navigationMode: OverlayNavigationMode) {
    if (!registered.value)
      return

    const shouldCleanupHistory = dialogStore.shouldCleanupHistoryOnClose(overlayId, navigationMode)

    dialogStore.unregisterOverlay(overlayId)
    registered.value = false

    if (shouldCleanupHistory)
      dialogStore.cleanupOverlayHistory()
  }

  watch(options.visible, (visible) => {
    if (visible)
      registerVisibleOverlay()
    else
      unregisterVisibleOverlay(options.navigationMode.value)
  }, { immediate: true })

  onBeforeUnmount(() => {
    unregisterVisibleOverlay(options.navigationMode.value)
  })

  return {
    overlayId,
    overlayIndex,
    isTopOverlay,
  }
}
