<script setup lang="ts">
import type { TransitionProps } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  hideHeader?: boolean
  direction?: 'left' | 'right'
  overlayOpacity?: number
  showInfo?: boolean
  width?: string
}>(), {
  hideHeader: false,
  direction: 'right',
  overlayOpacity: 0.5,
  showInfo: false,
  width: '320px',
})

const visible = defineModel<boolean>()

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
  <transition v-bind="transitionClasses">
    <aside
      v-if="visible"
      v-click-outside="() => handleClose()"
      class="fixed top-0 z-50 flex h-dvh w-4/5 flex-col bg-white px-5 dark:bg-hana-black"
      :class="[direction === 'right' ? 'right-0' : 'left-0']"
      :style="{ maxWidth: width }"
    >
      <slot name="header">
        <div v-if="!hideHeader" class="flex h-12 items-center gap-2">
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
  <div
    class="fixed inset-0 z-40 bg-black transition-opacity duration-300"
    :class="{ 'pointer-events-none': !visible }"
    :style="{ opacity: visible ? props.overlayOpacity : 0 }"
    @click="handleClose"
  />
</template>
