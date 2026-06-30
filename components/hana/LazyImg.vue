<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'

const props = withDefaults(defineProps<{
  src: string
  alt: string
  width: number | string
  height: number | string
  fallbackText?: string
  rootMargin?: string
  surfaceClass?: string
  imgClass?: string
}>(), {
  rootMargin: '0px 0px 200px 0px',
  surfaceClass: 'rounded-lg',
  imgClass: 'object-cover',
})

const emit = defineEmits<{
  (e: 'load', event: Event): void
  (e: 'error', event: Event): void
}>()

const containerRef = useTemplateRef('container')
const shouldLoad = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)

const containerStyle = computed(() => ({
  width: normalizeLength(props.width),
  height: normalizeLength(props.height),
}))

const imageWidth = computed(() =>
  typeof props.width === 'number' ? props.width : undefined,
)

const imageHeight = computed(() =>
  typeof props.height === 'number' ? props.height : undefined,
)

const imageClasses = computed(() => [
  'size-full',
  props.imgClass,
])

const resolvedFallbackText = computed(() => {
  const text = props.fallbackText?.trim()
  if (text)
    return text

  const firstChar = props.alt.trim().charAt(0)
  return firstChar ? firstChar.toUpperCase() : '?'
})

const showImage = computed(() => shouldLoad.value && !hasError.value && !!props.src.trim())
const showLoading = computed(() => !hasError.value && (!shouldLoad.value || !isLoaded.value))
const showError = computed(() => hasError.value)

let observer: IntersectionObserver | null = null

function normalizeLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

function disconnectObserver() {
  if (!observer)
    return

  observer.disconnect()
  observer = null
}

function setupObserver() {
  if (import.meta.server || shouldLoad.value || !containerRef.value)
    return

  disconnectObserver()

  if (!('IntersectionObserver' in window)) {
    shouldLoad.value = true
    return
  }

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (!entry?.isIntersecting)
      return

    shouldLoad.value = true
    disconnectObserver()
  }, {
    root: null,
    rootMargin: props.rootMargin,
    threshold: 0,
  })

  observer.observe(containerRef.value)
}

function syncImageState() {
  isLoaded.value = false
  hasError.value = false

  if (!props.src.trim()) {
    shouldLoad.value = false
    hasError.value = true
    disconnectObserver()
    return
  }

  if (shouldLoad.value)
    return

  setupObserver()
}

function handleLoad(event: Event) {
  isLoaded.value = true
  emit('load', event)
}

function handleError(event: Event) {
  hasError.value = true
  emit('error', event)
}

onMounted(syncImageState)

watch(() => props.src, syncImageState)

onBeforeUnmount(() => {
  disconnectObserver()
})
</script>

<template>
  <div ref="container" :style="containerStyle" class="relative overflow-hidden" :class="props.surfaceClass">
    <img
      v-if="showImage"
      :src="props.src"
      :alt="props.alt"
      :width="imageWidth"
      :height="imageHeight"
      loading="lazy"
      :class="[imageClasses, isLoaded ? 'opacity-100' : 'opacity-0']"
      @load="handleLoad"
      @error="handleError"
    >
    <Transition name="hana-lazy-img-fade" mode="out-in">
      <div
        v-if="showLoading"
        key="loading"
        class="absolute inset-0 flex items-center justify-center bg-hana-blue-50 dark:bg-hana-black-600"
      >
        <LoaderCircle
          :size="24"
          class="block text-text animate-spin dark:text-hana-white-700"
        />
      </div>
      <div
        v-else-if="showError"
        key="error"
        class="absolute inset-0 flex select-none items-center justify-center bg-hana-blue text-xl text-white"
      >
        <span>{{ resolvedFallbackText }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hana-lazy-img-fade-enter-active,
.hana-lazy-img-fade-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.hana-lazy-img-fade-enter-from,
.hana-lazy-img-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
