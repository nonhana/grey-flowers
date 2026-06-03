<script setup lang="ts">
import type { TransitionProps } from 'vue'
import type { OverlayNavigationMode } from '~/composables/useOverlayNavigation'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  hideHeader?: boolean
  direction?: 'left' | 'right'
  overlayOpacity?: number
  showInfo?: boolean
  width?: string
  navigationMode?: OverlayNavigationMode
}>(), {
  hideHeader: false,
  direction: 'right',
  overlayOpacity: 0.5,
  showInfo: false,
  width: '320px',
  navigationMode: 'history',
})

const drawerRef = useTemplateRef('drawerRef')

const visible = defineModel<boolean>({ default: false })
const navigationMode = computed(() => props.navigationMode)
const { overlayIndex, isTopOverlay } = useOverlayNavigation({
  visible,
  navigationMode,
  close: handleClose,
})
const { trapFocus } = useFocusTrap(drawerRef, visible)
const drawerZIndex = computed(() => 40 + overlayIndex.value)
const overlayZIndex = computed(() => drawerZIndex.value)
const panelZIndex = computed(() => drawerZIndex.value + 1)

onClickOutside(drawerRef, () => {
  if (visible.value && isTopOverlay.value)
    handleClose()
})

function handleClose() {
  visible.value = false
}

const transitionClasses = computed<TransitionProps>(() => ({
  enterActiveClass: 'transition-transform duration-300 ease-in-out',
  enterFromClass: props.direction === 'right' ? 'translate-x-full' : '-translate-x-full',
  enterToClass: 'translate-x-0',
  leaveActiveClass: 'transition-transform duration-300 ease-in-out',
  leaveFromClass: 'translate-x-0',
  leaveToClass: props.direction === 'right' ? 'translate-x-full' : '-translate-x-full',
}))

function handleKeydown(event: KeyboardEvent) {
  if (!visible.value || !isTopOverlay.value)
    return

  trapFocus(event)

  if (event.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <teleport to="body">
    <div
      class="fixed inset-0 bg-black transition-opacity duration-300"
      :class="{ 'pointer-events-none': !visible }"
      :style="{ opacity: visible ? props.overlayOpacity : 0, zIndex: overlayZIndex }"
      @click="handleClose"
    />
    <transition v-bind="transitionClasses">
      <aside
        v-if="visible"
        ref="drawerRef"
        tabindex="-1"
        class="fixed top-0 w-4/5 flex flex-col bg-white px-5 h-dvh dark:bg-hana-black"
        :class="[direction === 'right' ? 'right-0' : 'left-0']"
        :style="{ maxWidth: width, zIndex: panelZIndex }"
      >
        <slot name="header">
          <div v-if="!hideHeader" class="h-12 flex items-center gap-2">
            <Icon v-if="icon" :name="icon" size="20" class="text-hana-blue dark:text-hana-blue-200" />
            <span v-if="title" class="flex-1 text-xl text-hana-blue dark:text-hana-blue-200">{{ title }}</span>
            <HanaButton icon="lucide:x" class="ml-auto" icon-button @click="handleClose" />
          </div>
          <hr class="border-text dark:border-hana-white-700">
        </slot>
        <div v-if="showInfo" class="mt-5">
          <div class="flex shrink-0 flex-col items-center justify-items-end gap-2">
            <NuxtImg class="rounded-full" src="/images/avatar.webp" alt="non_hana" width="96" height="96" />
            <h2 class="text-xl text-hana-blue dark:text-hana-blue-200">
              non_hana
            </h2>
            <p class="text-sm dark:text-hana-white">
              不要为每一件事都赋予意义。
            </p>
          </div>
          <hr class="mt-5 border-text dark:border-hana-white-700">
        </div>
        <div class="mt-5 flex-1 overflow-auto">
          <slot :close="handleClose" />
        </div>
        <div v-if="$slots.footer" class="my-5">
          <hr class="mb-5 border-text dark:border-hana-white-700">
          <slot name="footer" :close="handleClose" />
        </div>
      </aside>
    </transition>
  </teleport>
</template>
