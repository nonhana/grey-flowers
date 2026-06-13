<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'

const props = defineProps<{
  site: string
  image: string
}>()

type ImgStatus = 'loading' | 'success' | 'error'

const status = ref<ImgStatus>('loading')
const firstCharOfSite = computed(() => props.site.charAt(0).toUpperCase() || '?')

let imageLoader: HTMLImageElement | null = null
let loadVersion = 0

function clearImageLoader() {
  if (!imageLoader)
    return

  imageLoader.onload = null
  imageLoader.onerror = null
  imageLoader = null
}

function updateStatus(nextStatus: ImgStatus, version: number) {
  if (version !== loadVersion)
    return

  status.value = nextStatus
  clearImageLoader()
}

function resolveImageStatus() {
  if (import.meta.server)
    return

  const src = props.image.trim()
  const version = ++loadVersion

  clearImageLoader()

  if (!src) {
    status.value = 'error'
    return
  }

  status.value = 'loading'

  const loader = new Image()
  imageLoader = loader
  loader.decoding = 'async'
  loader.onload = () => updateStatus('success', version)
  loader.onerror = () => updateStatus('error', version)
  loader.src = src

  if (loader.complete) {
    // 利用图像的固有宽度（在浏览器渲染之前的原始宽度）来判断是否加载失败
    // 如果加载失败，naturalWidth 应该是 0
    updateStatus(loader.naturalWidth > 0 ? 'success' : 'error', version)
  }
}

onMounted(resolveImageStatus)

watch(() => props.image, resolveImageStatus)

onBeforeUnmount(() => {
  loadVersion += 1
  clearImageLoader()
})
</script>

<template>
  <div class="size-16 shrink-0">
    <Transition name="card-img-fade" mode="out-in">
      <div
        v-if="status === 'loading'"
        key="loading"
        class="size-full flex items-center justify-center rounded-lg bg-hana-blue-50 dark:bg-hana-black-600"
      >
        <LoaderCircle
          :size="24"
          class="block text-text animate-spin dark:text-hana-white-700"
        />
      </div>
      <img
        v-else-if="status === 'success'"
        key="success"
        :src="image"
        :alt="`${site}_logo`"
        width="64"
        height="64"
        class="size-full rounded-lg object-cover"
      >
      <div
        v-else
        key="error"
        class="size-full flex select-none items-center justify-center rounded-lg bg-hana-blue text-xl"
      >
        <span class="text-white">{{ firstCharOfSite }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.card-img-fade-enter-active,
.card-img-fade-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.card-img-fade-enter-from,
.card-img-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
