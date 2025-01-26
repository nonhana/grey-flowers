<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useStore } from '~/store'

const props = defineProps<{
  src: string
  alt?: string
  width?: number | string
  height?: number | string
}>()

const { dialogStore } = useStore()
const { dialogCount } = toRefs(dialogStore)

const { toggleScrollable } = useToggleScrollable()

const imgStyle = computed<CSSProperties>(() => ({
  width: (typeof props.width === 'number' ? `${props.width}px` : props.width)
    ?? 'auto',
  height: (typeof props.height === 'number' ? `${props.height}px` : props.height)
    ?? 'auto',
}))

const displaying = ref(false)
const imgRef = ref<HTMLImageElement | null>(null)

const {
  generateMask,
  generateNewImg,
  handleWheel,
  handleTouchStart,
  clearDOM,
} = useImgViewer(imgRef)

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && displaying.value) {
    toggleDisplay()
  }
}

function toggleEventListener(type: 'on' | 'off') {
  switch (type) {
    case 'on':
      window.addEventListener('wheel', preventDefault, {
        passive: false,
      })
      window.addEventListener('touchmove', preventDefault, {
        passive: false,
      })
      window.addEventListener('wheel', handleWheel)
      window.addEventListener('touchstart', handleTouchStart)
      window.addEventListener('keydown', handleKeyDown)
      break
    case 'off':
      window.removeEventListener('wheel', preventDefault)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchmove', preventDefault)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('keydown', handleKeyDown)
      break
    default:
      break
  }
}

function toggleDisplay() {
  if (displaying.value) {
    clearDOM()
    setTimeout(() => {
      displaying.value = false
      if (!dialogCount.value) {
        toggleScrollable(false)
      }
      toggleEventListener('off')
    }, 500)
  }
  else {
    displaying.value = true
    if (!dialogCount.value) {
      toggleScrollable(true)
    }
    toggleEventListener('on')
  }
}

function handleClick() {
  if (imgRef.value) {
    toggleDisplay()
    generateMask(toggleDisplay)
    generateNewImg()
  }
}
</script>

<template>
  <div class="relative flex flex-col items-center gap-2 text-sm text-text">
    <div :style="imgStyle">
      <img
        ref="imgRef"
        :src="src"
        alt="demo-img"
        class="size-full cursor-pointer object-cover"
        :style="{ visibility: displaying ? 'hidden' : 'visible' }"
        @click="handleClick"
      >
    </div>
    <span v-if="alt" class="dark:text-hana-white">{{ alt }}</span>
  </div>
</template>
