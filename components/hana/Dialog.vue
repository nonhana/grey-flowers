<script setup lang="ts">
import type { TransitionProps } from 'vue'
import type { DialogOptions } from '~/composables/useDialog'
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core'
import { useStore } from '~/store'

const props = withDefaults(defineProps<DialogOptions>(), {
  title: '',
  overlayOpacity: 0.5,
  hideHeader: false,
  width: '400px',
  height: 'auto',
  smoothHeight: true,
  programmatic: false,
  closable: true,
  hideScrollbar: true,
})

const emits = defineEmits<{
  (e: 'ok'): void
  (e: 'cancel'): void
  (e: 'destroy'): void
  (e: 'update:modelValue', value: boolean): void
}>()

const { dialogStore } = useStore()
const { increaseDialogCount, decreaseDialogCount, getDialogCount } = dialogStore

const programmaticVisible = ref(false)
const dialogVisible = computed(() => props.programmatic ? programmaticVisible.value : props.modelValue)

const isClient = ref(false)

const BASE_Z_INDEX = 40
const dialogZIndex = ref(BASE_Z_INDEX)
const reducedMotion = usePreferredReducedMotion()

const contentRef = useTemplateRef('content')
const { height: contentHeight } = useElementSize(contentRef, { width: 0, height: 0 })

const shouldSmoothHeight = computed(() =>
  !props.programmatic
  && props.height === 'auto'
  && props.smoothHeight
  && reducedMotion.value !== 'reduce',
)

const viewportHeight = ref('auto')
let heightFrameId: number | null = null

function cancelHeightFrame() {
  if (heightFrameId !== null) {
    cancelAnimationFrame(heightFrameId)
    heightFrameId = null
  }
}

function setViewportHeight(nextHeight: string) {
  if (viewportHeight.value === nextHeight)
    return

  cancelHeightFrame()
  heightFrameId = requestAnimationFrame(() => {
    viewportHeight.value = nextHeight
    heightFrameId = null
  })
}

function syncViewportHeight() {
  if (!dialogVisible.value) {
    viewportHeight.value = 'auto'
    return
  }

  if (!shouldSmoothHeight.value) {
    viewportHeight.value = props.height
    return
  }

  const measuredHeight = contentRef.value?.scrollHeight ?? contentHeight.value
  const nextHeight = `${Math.ceil(measuredHeight)}px`
  setViewportHeight(nextHeight)
}

onMounted(() => {
  isClient.value = true
  if (props.programmatic) {
    requestAnimationFrame(() => {
      programmaticVisible.value = true
    })
  }
  else {
    syncViewportHeight()
  }
})

function handleClose() {
  if (props.programmatic && props.closable === false) {
    return
  }

  if (props.programmatic) {
    programmaticVisible.value = false
  }
  else {
    emits('update:modelValue', false)
  }
}

const transitionClasses: TransitionProps = {
  enterActiveClass: 'transition-all duration-300',
  enterFromClass: 'opacity-0 scale-105',
  enterToClass: 'opacity-100',
  leaveActiveClass: 'transition-all duration-300',
  leaveFromClass: 'opacity-100',
  leaveToClass: 'opacity-0 scale-95',
}

function handleAfterLeave() {
  emits('destroy')
}

const overlayOpacity = ref(0)
const computedOverlayOpacity = computed(() => {
  if (!dialogVisible.value)
    return 0
  return props.programmatic ? 0.5 : props.overlayOpacity
})

watch(dialogVisible, (newV) => {
  if (newV) {
    dialogZIndex.value = BASE_Z_INDEX + getDialogCount()
    increaseDialogCount()
    // 使用 nextTick 确保 DOM 更新后再触发动画
    nextTick(() => {
      overlayOpacity.value = computedOverlayOpacity.value
      syncViewportHeight()
    })
  }
  else {
    overlayOpacity.value = 0
    dialogZIndex.value = BASE_Z_INDEX
    decreaseDialogCount()
    cancelHeightFrame()
    viewportHeight.value = props.height
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape')
    return
  if (!dialogVisible.value)
    return
  const topZ = BASE_Z_INDEX + (getDialogCount() - 1)
  if (dialogZIndex.value === topZ) {
    handleClose()
  }
}

watch(dialogVisible, (isVisible) => {
  if (typeof window === 'undefined')
    return

  if (isVisible) {
    window.addEventListener('keydown', handleKeydown)
  }
  else {
    window.removeEventListener('keydown', handleKeydown)
  }
}, { immediate: true })

watch([contentHeight, shouldSmoothHeight, () => props.height], () => {
  syncViewportHeight()
}, { flush: 'post' })

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
  cancelHeightFrame()
})

defineExpose({
  handleClose,
})
</script>

<template>
  <teleport v-if="isClient" to="body">
    <div
      class="fixed inset-0 bg-black transition-opacity duration-300"
      :class="{ 'pointer-events-none': !dialogVisible }"
      :style="{
        zIndex: dialogZIndex,
        opacity: overlayOpacity,
      }"
      @click="handleClose"
    />
    <transition v-bind="transitionClasses" @after-leave="handleAfterLeave">
      <div
        v-if="dialogVisible"
        id="hana-dialog"
        role="dialog"
        :aria-labelledby="title ? 'dialog-title' : undefined"
        aria-modal="true"
        class="fixed left-1/2 top-1/2 max-w-[90%] rounded-2xl bg-white p-5 shadow -translate-x-1/2 -translate-y-1/2 dark:bg-hana-black"
        :style="{ width, zIndex: dialogZIndex }"
      >
        <div class="mb-5">
          <slot
            name="header"
            :close="handleClose"
          >
            <div v-if="!hideHeader" class="flex items-center">
              <span v-if="title" id="dialog-title" class="flex-1 text-2xl font-bold dark:text-hana-white">{{ title }}</span>
              <HanaButton v-if="!programmatic" icon="lucide:x" class="relative ml-auto -right-2 -top-2" icon-button @click="handleClose" />
            </div>
          </slot>
        </div>
        <div v-if="programmatic">
          <span class="dark:text-hana-white">{{ content }}</span>
        </div>
        <div
          v-else
          class="max-h-[80dvh] overflow-y-auto"
          :class="[{
            'transition-[height] duration-200 ease-out': shouldSmoothHeight,
            'scrollbar-none': hideScrollbar,
          }]"
          :style="{ height: shouldSmoothHeight ? viewportHeight : height }"
        >
          <div ref="content">
            <slot />
          </div>
        </div>
        <div v-if="programmatic" class="mt-5 flex justify-end gap-4">
          <HanaButton
            v-if="showCancelButton || false"
            shape="square"
            class="w-20"
            @click="emits('cancel')"
          >
            {{ cancelText || '取消' }}
          </HanaButton>
          <HanaButton
            v-if="showOkButton || true"
            dark-mode
            shape="square"
            class="w-20"
            @click="emits('ok')"
          >
            {{ okText || '确定' }}
          </HanaButton>
        </div>
        <div v-else-if="$slots.footer" class="mt-5">
          <slot name="footer" />
        </div>
      </div>
    </transition>
  </teleport>
</template>
