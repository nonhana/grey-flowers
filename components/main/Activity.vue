<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'
import { Activity, ArrowRight, CheckCircle, CloudOff, Inbox, LoaderCircle, RefreshCw } from '@lucide/vue'

const ACTIVITY_PAGE_SIZE = 20
const LOAD_MORE_ROOT_MARGIN = '0px 240px 0px 0px'
const skeletonCards = Array.from({ length: ACTIVITY_PAGE_SIZE }, (_, index) => index)

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
} = useActivityList({
  pageSize: ACTIVITY_PAGE_SIZE,
  errorMessages: {
    initialResponse: '动态暂时没有加载出来，请稍后重试。',
    initialException: '动态暂时没有加载出来，请稍后重试。',
    loadMoreResponse: '动态暂时没有加载出来，请稍后重试。',
    loadMoreException: '动态暂时没有加载出来，请稍后重试。',
  },
})

const containerRef = useTemplateRef('container')
const railTrackRef = useTemplateRef('railTrack')
const loadMoreTriggerRef = useTemplateRef('loadMoreTrigger')

const isBootstrapping = ref(true)
const isVisible = ref(false)
let revealObserver: IntersectionObserver | null = null
let loadMoreObserver: IntersectionObserver | null = null

const router = useRouter()

const detailDialogVisible = ref(false)
const curActivity = ref<ActivityItem>()

const hasActivities = computed(() => activities.value.length > 0)

const {
  isDragging,
  consumeSuppressedSelect,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  handleLostPointerCapture,
  handleWheel,
  stopMomentum,
  cleanup: cleanupRail,
} = useHorizontalRail()

watch(containerRef, (element) => {
  if (!element || isVisible.value || typeof window === 'undefined' || !('IntersectionObserver' in window))
    return

  revealObserver?.disconnect()
  revealObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        isVisible.value = true
        revealObserver?.disconnect()
        revealObserver = null
      }
    },
    { threshold: 0.15 },
  )

  revealObserver.observe(element)
}, { flush: 'post' })

watchEffect(() => {
  if (railTrackRef.value && loadMoreTriggerRef.value)
    setupLoadMoreObserver()
}, { flush: 'post' })

onMounted(async () => {
  try {
    await fetchActivities()
  }
  finally {
    isBootstrapping.value = false
  }
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  loadMoreObserver?.disconnect()
  cleanupRail()
})

async function fetchActivities() {
  await fetchNext()

  if (!loadMoreError.value) {
    await nextTick()
    refreshLoadMoreObserver()
  }
}

async function retryHomeInitial() {
  await retryInitial()

  if (!loadMoreError.value) {
    await nextTick()
    refreshLoadMoreObserver()
  }
}

async function retryHomeLoadMore() {
  await retryLoadMore()

  if (!loadMoreError.value) {
    await nextTick()
    refreshLoadMoreObserver()
  }
}

function setupLoadMoreObserver() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window))
    return
  if (!railTrackRef.value || !loadMoreTriggerRef.value)
    return

  loadMoreObserver?.disconnect()
  loadMoreObserver = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && hasMore.value && !loadingMore.value && !loadMoreError.value)
      fetchActivities()
  }, {
    root: railTrackRef.value,
    rootMargin: LOAD_MORE_ROOT_MARGIN,
    threshold: 0,
  })
  loadMoreObserver.observe(loadMoreTriggerRef.value)
}

function refreshLoadMoreObserver() {
  if (!loadMoreObserver || !loadMoreTriggerRef.value || !hasMore.value)
    return

  loadMoreObserver.unobserve(loadMoreTriggerRef.value)
  loadMoreObserver.observe(loadMoreTriggerRef.value)
}

function gotoRecently() {
  router.push('/recently')
}

function handleCardSelect(item: ActivityItem) {
  if (consumeSuppressedSelect())
    return

  stopMomentum()
  curActivity.value = item
  detailDialogVisible.value = true
}
</script>

<template>
  <HanaInfoCard title="最近动态" :icon="Activity">
    <template #action>
      <HanaButton :icon="ArrowRight" @click="gotoRecently">
        查看全部动态
      </HanaButton>
    </template>

    <div v-if="isBootstrapping || loadingInitial" class="m-inline-[calc(50%-50vw)] max-w-[100vw] w-[100vw]">
      <div class="activity-rail-track pointer-events-none select-none" aria-hidden="true">
        <MainActivitySkeletonCard v-for="i in skeletonCards" :key="i" />
      </div>
    </div>

    <div v-else-if="initialError && !hasActivities" class="border border-primary/60 rounded-[24px] bg-white/75 p-5 dark:border-hana-black-200/80 dark:bg-hana-black-800/75">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-4">
          <div class="mt-1 size-11 flex shrink-0 items-center justify-center rounded-full bg-error-0 text-error-3 dark:bg-hana-black-700">
            <CloudOff :size="18" />
          </div>
          <div class="space-y-1">
            <p class="text-base text-hana-black leading-7 dark:text-hana-white">
              {{ initialError }}
            </p>
            <p class="text-sm text-text leading-6 dark:text-hana-white-700">
              可以先打开完整动态页，也可以在这里重新获取最近 5 条更新。
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <HanaButton :icon="RefreshCw" shape="square" @click="retryHomeInitial">
            重新获取
          </HanaButton>
          <HanaButton :icon="ArrowRight" shape="square" @click="gotoRecently">
            打开动态页
          </HanaButton>
        </div>
      </div>
    </div>

    <div v-else-if="!hasActivities" class="border border-primary/55 rounded-[24px] bg-white/75 p-5 dark:border-hana-black-200/80 dark:bg-hana-black-800/75">
      <div class="flex items-start gap-4">
        <div class="mt-1 size-11 flex shrink-0 items-center justify-center rounded-full bg-hana-blue-50 text-hana-blue dark:bg-hana-black-700 dark:text-hana-blue-200">
          <Inbox :size="18" />
        </div>
        <div class="space-y-1">
          <p class="text-base text-hana-black leading-7 dark:text-hana-white">
            这里暂时还没有新的动态。
          </p>
          <p class="text-sm text-text leading-6 dark:text-hana-white-700">
            等下一次随手记录、贴图或分享音乐时，这里会先出现最新的一则。
          </p>
        </div>
      </div>
    </div>

    <div
      v-else
      ref="container"
      class="[transition:opacity_0.45s_ease,transform_0.45s_ease] m-inline-[calc(50%-50vw)] max-w-[100vw] w-[100vw] motion-reduce:[transition:none] motion-reduce:!transform-none motion-reduce:!opacity-100"
      :class="isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'"
    >
      <div
        ref="railTrack"
        class="activity-rail-track"
        :data-dragging="isDragging ? 'true' : 'false'"
        aria-label="最近动态横向预览"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
        @lostpointercapture="handleLostPointerCapture"
        @wheel="handleWheel"
        @dragstart.prevent
      >
        <MainActivityRailCard
          v-for="item in activities"
          :key="item.id"
          :item="item"
          @select="handleCardSelect"
        />
        <div
          ref="loadMoreTrigger"
          class="flex flex-[0_0_3rem] items-center self-stretch justify-center"
          aria-hidden="true"
        >
          <LoaderCircle
            v-if="loadingMore"
            :size="22"
            class="text-text animate-spin dark:text-hana-white-700"
          />
          <button
            v-else-if="loadMoreError && hasActivities"
            type="button"
            class="size-10 inline-flex items-center justify-center rounded-full bg-error-0/70 text-error-3 transition-colors dark:bg-hana-black-700 hover:bg-error-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-3/40 dark:hover:bg-hana-black-600"
            :aria-label="loadMoreError"
            :title="loadMoreError"
            @click="retryHomeLoadMore"
          >
            <RefreshCw :size="18" />
          </button>
          <CheckCircle
            v-else-if="!hasMore && hasActivities"
            :size="22"
            class="text-text dark:text-hana-white-700"
          />
        </div>
      </div>
    </div>
  </HanaInfoCard>

  <RecentlyDetailDialog v-model="detailDialogVisible" :item="curActivity" />
</template>
