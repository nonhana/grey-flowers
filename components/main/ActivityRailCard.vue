<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const props = defineProps<{
  item: ActivityItem
}>()

const emit = defineEmits<{
  (e: 'select', item: ActivityItem): void
}>()

const previewImage = computed(() => props.item.images?.[0] ?? '')
const trackPreview = computed(() => props.item.music?.[0])
const imageCount = computed(() => props.item.images?.length ?? 0)
const musicCount = computed(() => props.item.music?.length ?? 0)

const typeLabel = computed(() => {
  if (imageCount.value > 0)
    return '图片'
  if (musicCount.value > 0)
    return '音乐'
  return '随记'
})

const typeIcon = computed(() => {
  if (imageCount.value > 0)
    return 'lucide:image'
  if (musicCount.value > 0)
    return 'lucide:music-4'
  return 'lucide:message-circle'
})

const excerpt = computed(() => {
  const rawContent = props.item.content?.trim()
  const content = rawContent && rawContent.length > 0 ? rawContent : getFallbackContent(props.item)
  return truncateContent(content, 120)
})

const absoluteDate = computed(() => formatDateDotYmdHm(props.item.publishedAt))
const compactDate = computed(() => formatMonthDay(props.item.publishedAt))

const detailAriaLabel = computed(() => `查看${typeLabel.value}动态详情，发布时间 ${absoluteDate.value}`)

function truncateContent(content: string, maxLength: number) {
  return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content
}

function getFallbackContent(item: ActivityItem) {
  if (item.music?.length) {
    const track = item.music[0]
    return track
      ? `记下了正在循环的 ${track.title}。`
      : '记下了一段想留住的音乐。'
  }

  if (item.images?.length)
    return `贴上了 ${item.images.length} 张想留下的图片。`

  return '留下了一则很短的近况。'
}
</script>

<template>
  <button
    type="button"
    class="group w-[min(82vw,22rem)] shrink-0 border border-primary/55 rounded-3xl p-5 text-left shadow-sm transition-colors transition-shadow transition-transform duration-300 ease-out from-white via-hana-blue-50/70 to-white bg-gradient-to-b lg:w-88 sm:w-80 xl:w-96 dark:border-hana-black-200/80 hover:border-hana-blue/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-hana-blue/45 focus-visible:ring-offset-white dark:from-hana-black-800 dark:via-hana-black-700 dark:to-hana-black hover:-translate-y-0.5 dark:hover:border-hana-blue-300/40 dark:focus-visible:ring-hana-blue-300/45 dark:focus-visible:ring-offset-hana-black-800"
    :aria-label="detailAriaLabel"
    :data-activity-card-id="item.id"
    @click="emit('select', props.item)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex items-center gap-3">
        <span class="size-9 flex shrink-0 items-center justify-center rounded-full bg-hana-blue-100/80 text-hana-blue dark:bg-hana-black-600 dark:text-hana-blue-200">
          <Icon :name="typeIcon" size="16" />
        </span>

        <div class="min-w-0">
          <p class="text-xs/5 text-hana-blue dark:text-hana-blue-200">
            {{ typeLabel }}
          </p>
          <time
            :datetime="item.publishedAt"
            :title="absoluteDate"
            class="mt-1 block text-xs/5 text-text dark:text-hana-white-700"
          >
            {{ formatRelativeTime(item.publishedAt) }}
          </time>
        </div>
      </div>

      <span class="text-xs/5 text-text dark:text-hana-white-700">
        {{ compactDate }}
      </span>
    </div>

    <p class="mt-4 whitespace-pre-line text-sm/6 text-hana-black line-clamp-4 dark:text-hana-white">
      {{ excerpt }}
    </p>

    <div
      v-if="previewImage"
      class="relative mt-4 overflow-hidden border border-white/70 rounded-5 bg-white/75 dark:border-hana-black-200/80 dark:bg-hana-black-700/70"
    >
      <NuxtImg
        :src="previewImage"
        alt="最近动态配图预览"
        class="aspect-[5/3] w-full select-none transition-transform duration-500 ease-out object-cover group-hover:scale-103"
      />

      <span
        v-if="imageCount > 1"
        class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
      >
        <Icon name="lucide:images" size="12" />
        {{ imageCount }}
      </span>

      <span
        v-if="musicCount > 0"
        class="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/82 px-2 py-1 text-xs text-hana-blue backdrop-blur-sm dark:bg-hana-black/78 dark:text-hana-blue-200"
      >
        <Icon name="lucide:music-4" size="12" />
        {{ musicCount }} 首歌
      </span>
    </div>

    <div
      v-else-if="trackPreview"
      class="mt-4 flex items-center gap-3 border border-primary/50 rounded-5 bg-white/72 p-3 dark:border-hana-black-200/80 dark:bg-hana-black-700/70"
    >
      <NuxtImg
        v-if="trackPreview.cover"
        :src="trackPreview.cover"
        :alt="trackPreview.album || trackPreview.title"
        class="size-16 shrink-0 select-none rounded-2xl object-cover"
      />

      <div
        v-else
        class="size-16 flex shrink-0 items-center justify-center rounded-2xl bg-hana-blue-100 text-hana-blue dark:bg-hana-black-600 dark:text-hana-blue-200"
      >
        <Icon name="lucide:music-4" size="20" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="mt-1 text-sm/6 text-hana-black line-clamp-2 dark:text-hana-white">
          {{ trackPreview.title }}
        </p>
        <p class="mt-1 truncate text-xs/5 text-text dark:text-hana-white-700">
          {{ trackPreview.artist }}
        </p>
      </div>

      <span
        v-if="musicCount > 1"
        class="rounded-full bg-hana-blue-100/80 px-2 py-1 text-xs text-hana-blue dark:bg-hana-black-600 dark:text-hana-blue-200"
      >
        {{ musicCount }}
      </span>
    </div>

    <div
      v-else
      class="mt-4 flex items-center gap-2 border border-primary/45 rounded-5 border-dashed bg-white/55 px-3 py-3 text-xs text-text dark:border-hana-black-200/80 dark:bg-hana-black-700/55 dark:text-hana-white-700"
    >
      <Icon name="lucide:feather" size="14" />
      Something to remember
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text dark:text-hana-white-700">
      <span class="inline-flex items-center gap-1">
        <Icon name="lucide:message-circle" size="12" />
        {{ item.commentCount }} 评论
      </span>
      <span v-if="imageCount > 0" class="inline-flex items-center gap-1">
        <Icon name="lucide:image" size="12" />
        {{ imageCount }} 张图
      </span>
      <span v-if="musicCount > 0" class="inline-flex items-center gap-1">
        <Icon name="lucide:music-4" size="12" />
        {{ musicCount }} 首歌
      </span>
    </div>
  </button>
</template>
