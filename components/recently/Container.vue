<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const route = useRoute()
const router = useRouter()

const beforeClasses = `before:hidden before:md:block before:absolute before:inset-y-0 before:-left-8 before:h-full before:w-0.5 before:bg-hana-blue before:content-[''] dark:before:bg-hana-blue-200`
const afterClasses = `after:hidden after:md:block after:absolute after:left-[calc(-2rem-5px)] after:top-1/2 after:size-3 after:rounded-full after:bg-hana-blue after:content-[''] dark:after:bg-hana-blue-200`

const detailDialogVisible = defineModel<boolean>()
const curActivityId = ref<number | null>(null)

watch(() => route.query.id, (newId) => {
  if (newId !== undefined) {
    curActivityId.value = Number(newId)
    detailDialogVisible.value = true
  }
  else {
    detailDialogVisible.value = false
    curActivityId.value = null
  }
})
watch(detailDialogVisible, (newVisible) => {
  if (!newVisible) {
    curActivityId.value = null
    router.replace({ query: {} })
  }
})
onMounted(() => {
  curActivityId.value = Number(route.query.id)
  detailDialogVisible.value = route.query.id !== undefined
})

const activities = ref<ActivityItem[]>([])

const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasMore = ref(true)
const errorMessage = ref<string | null>(null)

const loadMoreTrigger = useTemplateRef('loadMoreTrigger')
let observer: IntersectionObserver | null = null

async function fetchActivities() {
  if (loading.value || !hasMore.value)
    return false

  loading.value = true
  errorMessage.value = null

  try {
    const data = await $fetch('/api/activity/list', {
      params: {
        page: page.value,
        pageSize,
      },
    })

    if (data.success) {
      const list = (data.payload || []) as ActivityItem[]
      activities.value.push(...list)

      if (list.length < pageSize) {
        hasMore.value = false
      }
      else {
        page.value += 1
      }

      return true
    }

    errorMessage.value = '加载失败，请稍后重试'
    return false
  }
  catch (error) {
    console.error('[Recently] fetchActivities error:', error)
    errorMessage.value = '加载失败，请检查网络连接'
    return false
  }
  finally {
    loading.value = false
  }
}

// 如果携带当前动态查询参数，需要确保当前动态已经加载
async function ensureCurActivityLoaded() {
  if (!curActivityId.value)
    return

  while (!activities.value.find(item => item.id === curActivityId.value) && hasMore.value) {
    const ok = await fetchActivities()
    if (!ok)
      break
  }
}

function setupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }

  if (typeof window === 'undefined')
    return

  if (!('IntersectionObserver' in window))
    return

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting) {
      void fetchActivities()
    }
  }, {
    root: null,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  })

  if (loadMoreTrigger.value)
    observer.observe(loadMoreTrigger.value)
}

onMounted(async () => {
  curActivityId.value = Number(route.query.id)
  detailDialogVisible.value = route.query.id !== undefined

  await fetchActivities()
  await ensureCurActivityLoaded()
  setupObserver()
})

onBeforeUnmount(() => {
  if (observer)
    observer.disconnect()
})

const curActivity = computed(() => activities.value.find(item => item.id === curActivityId.value))
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
  <Icon v-if="loading" name="lucide:loader-circle" size="32" class="mx-auto mt-2 block text-text animate-spin" />
  <Icon v-else-if="!hasMore && activities.length > 0" name="lucide:check-circle" size="32" class="mx-auto mt-2 block text-text" />
  <p
    v-if="errorMessage"
    class="mt-2 text-center text-sm text-error-3"
  >
    {{ errorMessage }}
  </p>
  <RecentlyDetailDialog v-model="detailDialogVisible" :item="curActivity" />
</template>
