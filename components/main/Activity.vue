<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const loading = ref(false)
const activities = ref<ActivityItem[]>([])

async function fetchActivities() {
  loading.value = true
  try {
    const data = await $fetch('/api/activity/list', {
      query: { page: 1, pageSize: 5 },
    })
    if (data.success) {
      activities.value = data.payload as ActivityItem[]
    }
  }
  catch (error) {
    console.error('[Home] fetchActivities error:', error)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchActivities()
})

const featuredActivity = computed(() => activities.value[0])

const compactActivities = computed(() => activities.value.slice(1))

const containerRef = useTemplateRef('container')
const isVisible = ref(false)

onMounted(() => {
  if (!containerRef.value)
    return

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    { threshold: 0.1 },
  )

  observer.observe(containerRef.value)
  onBeforeUnmount(() => observer.disconnect())
})

const router = useRouter()

const detailDialogVisible = ref(false)
const curActivity = ref<ActivityItem>()

function handleViewDetail(item: ActivityItem) {
  detailDialogVisible.value = true
  curActivity.value = item
}

function gotoRecently() {
  router.push('/recently')
}

/** 获取动态类型图标 */
function getActivityIcon(item: ActivityItem): string {
  if (item.music && item.music.length > 0)
    return 'lucide:music'
  if (item.images && item.images.length > 0)
    return 'lucide:image'
  return 'lucide:message-circle'
}

/** 获取动态类型标签 */
function getActivityLabel(item: ActivityItem): string {
  if (item.music && item.music.length > 0)
    return '音乐分享'
  if (item.images && item.images.length > 0)
    return '图片动态'
  return '日常碎语'
}

/** 截断内容 */
function truncateContent(content: string | undefined, maxLength: number): string {
  if (!content)
    return ''
  return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content
}
</script>

<template>
  <HanaInfoCard title="最近动态" icon="lucide:activity">
    <template #action>
      <HanaButton icon="lucide:arrow-right" @click="gotoRecently">
        查看全部动态
      </HanaButton>
    </template>

    <Icon v-if="loading" name="lucide:loader-circle" size="32" class="mx-auto mt-2 block text-text animate-spin" />

    <div v-else-if="activities.length === 0" class="py-12 text-center text-text dark:text-hana-white-700">
      <Icon name="lucide:inbox" size="48" class="mx-auto mb-4 opacity-50" />
      <p>暂无动态</p>
    </div>

    <transition name="activity-list">
      <div
        v-if="!loading && activities.length > 0"
        ref="container"
        class="grid gap-4 lg:grid-cols-[2fr_1fr_1fr] lg:grid-rows-2"
      >
        <article
          v-if="featuredActivity"
          class="group relative cursor-pointer overflow-hidden hana-card lg:row-span-2 p-0!"
          @click="handleViewDetail(featuredActivity)"
        >
          <div class="absolute inset-0 from-black/60 via-black/20 to-transparent bg-gradient-to-t" />

          <NuxtImg
            v-if="featuredActivity.images?.[0]"
            :src="featuredActivity.images[0]"
            class="absolute inset-0 size-full transition-transform duration-500 object-cover group-hover:scale-105"
          />

          <div
            v-else
            class="absolute inset-0 from-hana-blue-100 via-hana-blue-50 to-white bg-gradient-to-br dark:from-hana-black-800 dark:via-hana-black-700 dark:to-hana-black"
          >
            <div class="absolute inset-0 opacity-20">
              <Icon name="lucide:quote" class="absolute left-8 top-8 size-24 text-hana-blue" />
            </div>
          </div>

          <div class="relative z-10 h-full min-h-64 flex flex-col justify-end p-6 lg:min-h-80">
            <div class="mb-3 flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-hana-blue/90 px-3 py-1 text-xs text-white backdrop-blur-sm">
                <Icon :name="getActivityIcon(featuredActivity)" size="12" />
                {{ getActivityLabel(featuredActivity) }}
              </span>
            </div>

            <p
              v-if="featuredActivity.content"
              class="mb-4 text-sm text-text leading-relaxed line-clamp-3 drop-shadow"
            >
              {{ truncateContent(featuredActivity.content, 120) }}
            </p>

            <div class="flex items-center justify-between text-xs text-text">
              <time :datetime="featuredActivity.publishedAt" class="flex items-center gap-1">
                <Icon name="lucide:clock" size="12" />
                {{ featuredActivity.publishedAt }}
              </time>
              <span class="flex items-center gap-1">
                <Icon name="lucide:message-circle" size="12" />
                {{ featuredActivity.commentCount }}
              </span>
            </div>
          </div>

          <div class="absolute inset-0 bg-hana-blue/0 transition-colors duration-300 group-hover:bg-hana-blue/10" />
        </article>

        <article
          v-for="item in compactActivities"
          :key="item.id"
          class="group relative flex flex-col cursor-pointer overflow-hidden hana-card transition-all duration-300 p-4! hover:shadow-lg hover:-translate-y-0.5"
          @click="handleViewDetail(item)"
        >
          <div class="absolute size-16 opacity-10 -right-2 -top-2">
            <Icon :name="getActivityIcon(item)" class="size-full text-hana-blue" />
          </div>

          <div class="mb-2 flex items-center gap-1.5">
            <Icon
              :name="getActivityIcon(item)"
              size="14"
              class="text-hana-blue dark:text-hana-blue-300"
            />
            <span class="text-xs text-hana-blue dark:text-hana-blue-300">
              {{ getActivityLabel(item) }}
            </span>
          </div>

          <p class="mb-2 flex-1 text-sm text-text leading-tight line-clamp-2 dark:text-hana-white-700">
            {{ truncateContent(item.content, 120) }}
          </p>

          <div class="flex items-center justify-between text-xs text-text dark:text-hana-white-700">
            <time :datetime="item.publishedAt" class="flex items-center gap-1">
              <Icon name="lucide:clock" size="10" />
              {{ item.publishedAt.split(' ')[0] }}
            </time>
            <span class="flex items-center gap-1">
              <Icon name="lucide:message-circle" size="10" />
              {{ item.commentCount }}
            </span>
          </div>

          <div
            v-if="item.images && item.images.length > 0"
            class="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-md bg-black/50 px-1.5 py-0.5 text-xs text-white"
          >
            <Icon name="lucide:image" size="10" />
            <span>{{ item.images.length }}</span>
          </div>
        </article>
      </div>
    </transition>
  </HanaInfoCard>
  <RecentlyDetailDialog v-model="detailDialogVisible" :item="curActivity" />
</template>

<style scoped>
.activity-list-enter-active,
.activity-list-leave-active {
  transition: all 0.3s ease;
}

.activity-list-enter-from,
.activity-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
