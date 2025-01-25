<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'
import { activityData } from '~/data/mock'

const route = useRoute()
const router = useRouter()

const beforeClasses = 'before:absolute before:inset-y-0 before:-left-8 before:h-full before:w-0.5 before:bg-hana-blue before:content-[\'\'] dark:before:bg-hana-blue-200'
const afterClasses = 'after:absolute after:left-[calc(-2rem-5px)] after:top-1/2 after:size-3 after:rounded-full after:bg-hana-blue after:content-[\'\'] dark:after:bg-hana-blue-200'

const detailDialogVisible = defineModel<boolean>()

watch(() => route.query.id, newId => detailDialogVisible.value = newId !== undefined)
watch(detailDialogVisible, (newVisible) => {
  if (!newVisible) {
    router.replace({ query: {} })
  }
})
onMounted(() => detailDialogVisible.value = route.query.id !== undefined)

const i = 1
const curItem: ActivityItem = {
  id: i,
  title: `Activity ${i}`,
  content: `This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.
  This is the content of activity ${i}.`,
  images: ['https://moe.nonhana.pics/120273520.jpg', 'https://moe.nonhana.pics/120273520.jpg', 'https://moe.nonhana.pics/120273520.jpg'],
  publishedAt: '2021-10-10',
  commentCount: 10,
  editedAt: '2021-10-10',
}
</script>

<template>
  <ul class="relative m-auto flex max-w-screen-md flex-col pl-8">
    <li
      v-for="(item, index) in activityData"
      :key="item.id"
      class="relative py-4 first:pt-0 last:pb-0"
      :class="[beforeClasses, afterClasses]"
    >
      <RecentlyItem :item="item" :index="index" />
    </li>
  </ul>
  <RecentlyDetailDialog v-model="detailDialogVisible" :item="curItem" />
</template>
