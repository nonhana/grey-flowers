<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const route = useRoute()
const router = useRouter()

const beforeClasses = 'before:absolute before:inset-y-0 before:-left-8 before:h-full before:w-0.5 before:bg-hana-blue before:content-[\'\'] dark:before:bg-hana-blue-200'
const afterClasses = 'after:absolute after:left-[calc(-2rem-5px)] after:top-1/2 after:size-3 after:rounded-full after:bg-hana-blue after:content-[\'\'] dark:after:bg-hana-blue-200'

const detailDialogVisible = defineModel<boolean>()
const curActivityId = ref<number | null>(null)

watch(() => route.query.id, (newId) => {
  if (newId !== undefined) {
    curActivityId.value = Number(newId)
    detailDialogVisible.value = true
  }
})
watch(detailDialogVisible, (newVisible) => {
  if (!newVisible) {
    curActivityId.value = null
    router.replace({ query: {} })
  }
})
onMounted(() => detailDialogVisible.value = route.query.id !== undefined)

const activities = ref<ActivityItem[]>([])

async function fetchActivities() {
  const data = await $fetch('/api/activity/list')
  if (data.success) {
    activities.value = data.payload || []
  }
}

onMounted(fetchActivities)
</script>

<template>
  <ul class="relative m-auto flex max-w-screen-md flex-col pl-8">
    <li
      v-for="(item, index) in activities"
      :key="item.id"
      class="relative py-4 first:pt-0 last:pb-0"
      :class="[beforeClasses, afterClasses]"
    >
      <RecentlyItem :item="item" :index="index" />
    </li>
  </ul>
  <RecentlyDetailDialog v-model="detailDialogVisible" :activity-id="curActivityId" />
</template>
