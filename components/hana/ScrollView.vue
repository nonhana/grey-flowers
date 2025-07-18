<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  contentWrapperClass?: string
  contentClass?: string
  scrollbarClass?: string
  scrollEvents?: ((e: Event) => void)[]
}>()

const emit = defineEmits<{
  (e: 'heightChange', height: number): void
}>()

const scrollTop = defineModel<number>()

const containerElement = ref<HTMLDivElement | null>(null)
const contentWrapperElement = ref<HTMLDivElement | null>(null)
const contentElement = ref<HTMLDivElement | null>(null)

const scrollBarPos = ref<'right' | 'bottom' | 'none'>('right')
const containerHeight = ref(0)
const containerWidth = ref(0)
const contentHeight = ref(0)
const contentWidth = ref(0)
const scrollOffset = ref(0)

// 添加标志位防止循环更新
const isUpdatingFromExternal = ref(false)

const isRight = computed(() => scrollBarPos.value === 'right')
const isBottom = computed(() => scrollBarPos.value === 'bottom')
const isNone = computed(() => scrollBarPos.value === 'none')

const thumbLength = computed(() => {
  if (
    (isRight.value && (containerHeight.value === 0 || contentHeight.value === 0))
    || (isBottom.value && (containerWidth.value === 0 || contentWidth.value === 0))
  ) {
    return 0
  }
  const ratio = isRight.value
    ? containerHeight.value / contentHeight.value
    : containerWidth.value / contentWidth.value
  const trackSize = isRight.value ? containerHeight.value : containerWidth.value
  return Math.max(ratio * trackSize, 20)
})

const thumbOffset = computed(() => {
  if (
    (isRight.value && contentHeight.value <= containerHeight.value)
    || (isBottom.value && contentWidth.value <= containerWidth.value)
  ) {
    return 0
  }
  const maxScrollLength = isRight.value
    ? contentHeight.value - containerHeight.value
    : contentWidth.value - containerWidth.value
  const maxThumbLength = (isRight.value ? containerHeight.value : containerWidth.value) - thumbLength.value
  return (scrollOffset.value / maxScrollLength) * maxThumbLength
})

const scrollBarStyle = computed(() => {
  if (isRight.value) {
    return {
      width: '100%',
      height: `${thumbLength.value}px`,
      transform: `translateY(${thumbOffset.value}px)`,
    }
  }
  if (isBottom.value) {
    return {
      height: '100%',
      width: `${thumbLength.value}px`,
      transform: `translateX(${thumbOffset.value}px)`,
    }
  }
  return {}
})

const throttledEmit = useThrottleFn((offset: number) => {
  if (!isUpdatingFromExternal.value) {
    scrollTop.value = offset
  }
}, 50)

watch(scrollOffset, newOffset => throttledEmit(newOffset))

// 添加对外部 scrollTop 变化的监听
watch(scrollTop, (newScrollTop) => {
  if (newScrollTop !== undefined && !isUpdatingFromExternal.value && contentWrapperElement.value) {
    isUpdatingFromExternal.value = true

    nextTick(() => {
      if (contentWrapperElement.value) {
        if (isRight.value) {
          // 垂直滚动
          contentWrapperElement.value.scrollTop = newScrollTop
        }
        else if (isBottom.value) {
          // 水平滚动
          contentWrapperElement.value.scrollLeft = newScrollTop
        }
      }

      // 重置标志位
      isUpdatingFromExternal.value = false
    })
  }
}, { immediate: false })

let startOffset = 0
let startScrollOffset = 0

function onMouseMove(e: MouseEvent) {
  if (!contentWrapperElement.value)
    return
  const deltaOffset = (isRight.value ? e.clientY : e.clientX) - startOffset
  const scrollableLength = isRight.value
    ? contentHeight.value - containerHeight.value
    : contentWidth.value - containerWidth.value
  const trackLength = (isRight.value ? containerHeight.value : containerWidth.value) - thumbLength.value

  if (trackLength <= 0)
    return

  const newScrollOffset = startScrollOffset + deltaOffset * (scrollableLength / trackLength)
  if (isRight.value) {
    contentWrapperElement.value.scrollTop = newScrollOffset
  }
  else {
    contentWrapperElement.value.scrollLeft = newScrollOffset
  }
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function onThumbMouseDown(e: MouseEvent) {
  startOffset = isRight.value ? e.clientY : e.clientX
  startScrollOffset = scrollOffset.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onScroll(e: Event) {
  const target = e.target as HTMLDivElement
  scrollOffset.value = isRight.value ? target.scrollTop : target.scrollLeft
}

function updateSizes() {
  if (contentWrapperElement.value) {
    contentWrapperElement.value.scrollTop = 0
    contentWrapperElement.value.scrollLeft = 0
    scrollOffset.value = 0
  }

  nextTick(() => {
    if (!containerElement.value || !contentElement.value)
      return
    containerHeight.value = containerElement.value.clientHeight
    containerWidth.value = containerElement.value.clientWidth
    contentHeight.value = contentElement.value.scrollHeight
    contentWidth.value = contentElement.value.scrollWidth

    if (contentHeight.value > containerHeight.value) {
      scrollBarPos.value = 'right'
    }
    else if (contentWidth.value > containerWidth.value) {
      scrollBarPos.value = 'bottom'
    }
    else {
      scrollBarPos.value = 'none'
    }
  })
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!contentWrapperElement.value || !contentElement.value)
    return

  props.scrollEvents?.forEach(fn => contentWrapperElement.value!.addEventListener('scroll', fn))

  resizeObserver = new ResizeObserver(updateSizes)
  resizeObserver.observe(contentElement.value)
  resizeObserver.observe(containerElement.value!)

  updateSizes()

  if (containerElement.value) {
    const { height } = containerElement.value.getBoundingClientRect()
    emit('heightChange', height)
  }
})

onUnmounted(() => {
  if (contentWrapperElement.value) {
    props.scrollEvents?.forEach(fn => contentWrapperElement.value!.removeEventListener('scroll', fn))
  }
  resizeObserver?.disconnect()
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    ref="containerElement"
    role="group"
    class="relative size-full overflow-hidden" :class="[
      { 'md:pr-2.5': isRight, 'md:pb-2.5': isBottom },
    ]"
  >
    <div
      ref="contentWrapperElement"
      class="h-full w-full overflow-auto scrollbar-hidden" :class="[contentWrapperClass]"
      @scroll="onScroll"
    >
      <div ref="contentElement" :class="contentClass">
        <slot />
      </div>
    </div>

    <div
      class="absolute rounded bg-hana-blue-100 hidden md:block" :class="[
        scrollbarClass,
        {
          'right-0 top-0 w-2 h-full': isRight,
          'bottom-0 left-0 h-2 w-full': isBottom,
          'hidden': isNone,
        },
      ]"
    >
      <div
        v-if="!isNone"
        role="button"
        tabindex="0"
        class="rounded bg-hana-blue-200"
        :style="scrollBarStyle"
        @mousedown.prevent="onThumbMouseDown"
      />
    </div>
  </div>
</template>
