<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'
import { HanaImgViewer as ImgViewer } from 'hana-img-viewer'

const props = defineProps<{ activityId: number | null }>()
const { activityId } = toRefs(props)

const visible = defineModel<boolean>()
const loading = ref(false)
const fetchedActivity = ref<ActivityItem | null>(null)
const defaultActivity: ActivityItem = {
  id: 0,
  title: '未找到动态',
  publishedAt: '',
  editedAt: '',
  content: '暂无内容',
  images: [],
  commentCount: 0,
}

watchEffect(() => {
  if (visible.value && activityId.value) {
    loading.value = true
    $fetch('/api/activity/single', { query: { id: activityId.value } })
      .then((res) => {
        if (res.success) {
          fetchedActivity.value = res.payload
        }
      })
      .finally(() => {
        loading.value = false
      })
  }
})

const curActivity = computed(() => fetchedActivity.value ?? defaultActivity)
</script>

<template>
  <HanaDialog v-model="visible" title="动态详情" width="800px">
    <div v-if="loading" class="my-5 flex items-center justify-center">
      <Icon name="svg-spinners:8-dots-rotate" />&emsp;Loading...
    </div>

    <div v-else-if="!curActivity || !curActivity.content">
      <p class="text-gray-500">
        未找到动态详情，请稍后再试。
      </p>
    </div>

    <div v-else>
      <header class="flex items-center gap-2">
        <HanaAvatar :size="10" :avatar="hanaInfo.avatar" :username="hanaInfo.username" :site="hanaInfo.site" :show-info="false" />
        <div class="flex flex-col gap-1">
          <span class="text-black font-bold dark:text-hana-white">{{ hanaInfo.username }}</span>
          <span class="flex items-center text-sm text-text dark:text-hana-white-700 space-x-1">
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
          <ImgViewer
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
