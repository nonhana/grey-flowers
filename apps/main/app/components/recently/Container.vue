<script setup lang="ts">
import { CheckCircle, LoaderCircle, RefreshCw } from '@lucide/vue'

const beforeClasses = `before:hidden before:md:block before:absolute before:inset-y-0 before:-left-8 before:h-full before:w-0.5 before:bg-hana-blue before:content-[''] dark:before:bg-hana-blue-200`
const afterClasses = `after:hidden after:md:block after:absolute after:left-[calc(-2rem-5px)] after:top-1/2 after:size-3 after:rounded-full after:bg-hana-blue after:content-[''] dark:after:bg-hana-blue-200`

const {
  items: activities,
  hasMore,
  loadingInitial,
  loadingMore,
  initialError,
  loadMoreError,
  fetchNext,
  retryInitial,
  retryLoadMore,
  ensureItemLoaded,
} = useActivityList({
  errorMessages: {
    initialResponse: '加载失败，请稍后重试',
    initialException: '加载失败，请检查网络连接',
    loadMoreResponse: '加载失败，请稍后重试',
    loadMoreException: '加载失败，请检查网络连接',
  },
})

const {
  dialogVisible,
  detailStatus,
  resolvedActivity,
  detailErrorMessage,
  curActivityId,
  activateFromCurrentRoute,
  retryDetail,
} = useRecentlyDetailRoute({ activities, ensureItemLoaded })

const loadMoreTrigger = useTemplateRef('loadMoreTrigger')
let observer: IntersectionObserver | null = null

const loading = computed(() => loadingInitial.value || loadingMore.value)
const visibleErrorMessage = computed(() => loadMoreError.value ?? initialError.value)

async function retryCurrentError() {
  if (curActivityId.value !== null) {
    await retryDetail()
    return
  }
  if (activities.value.length === 0) {
    await retryInitial()
    return
  }
  await retryLoadMore()
}

function setupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }

  if (typeof window === 'undefined' || !('IntersectionObserver' in window))
    return

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting && hasMore.value && !loading.value && !visibleErrorMessage.value)
      fetchNext()
  }, {
    root: null,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  })

  if (loadMoreTrigger.value)
    observer.observe(loadMoreTrigger.value)
}

onMounted(async () => {
  const activated = await activateFromCurrentRoute()
  if (!activated)
    await fetchNext()

  setupObserver()
})

onBeforeUnmount(() => {
  if (observer)
    observer.disconnect()
})
</script>

<template>
  <ul class="relative m-auto max-w-screen-md flex flex-col pl-0 md:pl-8">
    <li
      v-for="(item, index) in activities"
      :key="item.id"
      class="relative py-4 first:pt-0 last:pb-0"
      :class="[beforeClasses, afterClasses]"
    >
      <RecentlyItem :item="item" :index="index" />
    </li>
  </ul>
  <div ref="loadMoreTrigger" class="h-8" />
  <LoaderCircle v-if="loading" :size="32" class="mx-auto mt-2 block text-text animate-spin dark:text-hana-white-700" />
  <CheckCircle v-else-if="!hasMore && activities.length > 0" :size="32" class="mx-auto mt-2 block text-text dark:text-hana-white-700" />
  <div v-if="visibleErrorMessage" class="mt-2 flex items-center justify-center gap-2">
    <p class="text-center text-sm text-error-3">
      {{ visibleErrorMessage }}
    </p>
    <button
      type="button"
      class="size-8 inline-flex items-center justify-center rounded-full text-error-3 transition-colors hover:bg-error-0/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-3/40 dark:hover:bg-hana-black-700"
      :aria-label="visibleErrorMessage"
      :title="visibleErrorMessage"
      @click="retryCurrentError"
    >
      <RefreshCw :size="16" />
    </button>
  </div>
  <RecentlyDetailDialog
    v-model="dialogVisible"
    navigation-mode="route"
    :status="detailStatus"
    :item="resolvedActivity"
    :error-message="detailErrorMessage"
  />
</template>
