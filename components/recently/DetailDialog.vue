<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const props = defineProps<{ activityId: number | null }>()
const visible = defineModel<boolean>()

const defaultActivity: ActivityItem = {
  id: 0,
  title: '未找到动态',
  publishedAt: '',
  editedAt: '',
  content: '暂无内容',
  images: [],
  commentCount: 0,
}

const { data: fetchedActivity, status: loading } = useAsyncData(
  `activity-${props.activityId}`,
  () => $fetch('/api/activity/single', { query: { id: props.activityId } }),
  {
    watch: [() => props.activityId],
    immediate: true,
  },
)
const curActivity = computed(() => fetchedActivity.value ? fetchedActivity.value.payload ?? defaultActivity : defaultActivity)
</script>

<template>
  <HanaDialog v-model="visible" title="动态详情" width="800px">
    <!-- 加载状态 -->
    <div v-if="loading === 'pending'" class="my-5 flex items-center justify-center">
      <Icon name="svg-spinners:8-dots-rotate" />&emsp;Loading...
    </div>

    <!-- 错误或空状态 -->
    <div v-else-if="!curActivity || !curActivity.content">
      <p class="text-gray-500">
        未找到动态详情，请稍后再试。
      </p>
    </div>

    <!-- 正常内容 -->
    <div v-else>
      <header class="flex items-center gap-2">
        <HanaAvatar :size="10" :avatar="hanaInfo.avatar" :username="hanaInfo.username" :site="hanaInfo.site" :show-info="false" />
        <div class="flex flex-col gap-1">
          <span class="font-bold text-black dark:text-hana-white">{{ hanaInfo.username }}</span>
          <span class="flex items-center space-x-1 text-sm text-text dark:text-hana-white-700">
            <Icon name="lucide:clock" size="14" />
            <time :datetime="curActivity.publishedAt">{{ curActivity.publishedAt }}</time>
          </span>
        </div>
      </header>
      <main class="my-5 text-black dark:text-hana-white">
        <p class="mb-5 whitespace-pre-wrap leading-6">
          {{ curActivity.content }}
        </p>
        <div v-if="curActivity.images && curActivity.images.length" class="flex flex-col gap-5">
          <HanaImgViewer
            v-for="image in curActivity.images"
            :key="image"
            :src="image"
            class="size-full cursor-pointer overflow-hidden rounded-xl object-cover"
            loading="lazy"
          />
        </div>
      </main>
      <footer class="py-5">
        <Comment type="recently" />
      </footer>
    </div>
  </HanaDialog>
</template>
