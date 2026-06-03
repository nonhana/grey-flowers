<script setup lang="ts">
import type { OverlayNavigationMode } from '~/composables/useOverlayNavigation'
import type { ActivityItem } from '~/types/activity'
import { HanaImgViewer } from 'hana-img-viewer'

const props = withDefaults(defineProps<{
  status?: ActivityDetailStatus
  item?: ActivityItem
  errorMessage?: string | null
  navigationMode?: OverlayNavigationMode
}>(), {
  status: 'ready',
  errorMessage: null,
  navigationMode: 'history',
})

const visible = defineModel<boolean>()

const activityPath = computed(() => props.item ? `/recently?id=${props.item.id}` : '')
</script>

<template>
  <HanaDialog v-model="visible" :navigation-mode="navigationMode" title="动态详情" width="800px">
    <div v-if="status === 'loading'" class="flex flex-col items-center gap-3 py-8 text-text dark:text-hana-white-700">
      <Icon name="lucide:loader-circle" size="28" class="animate-spin" />
      <p>
        正在加载动态详情...
      </p>
    </div>

    <div v-else-if="status === 'notFound'">
      <p class="text-gray-500">
        未找到动态详情，请稍后再试。
      </p>
    </div>

    <div v-else-if="status === 'error'">
      <p class="text-error-3">
        {{ errorMessage || '动态详情加载失败，请稍后重试。' }}
      </p>
    </div>

    <div v-else-if="status === 'ready' && item">
      <header class="flex items-center gap-2">
        <HanaAvatar :size="10" :avatar="hanaInfo.avatar" :username="hanaInfo.username" :site="hanaInfo.site" :show-info="false" />
        <div class="flex flex-col gap-1">
          <span class="text-black font-bold dark:text-hana-white">{{ hanaInfo.username }}</span>
          <span class="flex items-center text-sm text-text dark:text-hana-white-700 space-x-1">
            <Icon name="lucide:clock" size="14" />
            <time :datetime="item.publishedAt">{{ item.publishedAt }}</time>
          </span>
        </div>
      </header>
      <main class="my-5 text-black dark:text-hana-white space-y-5">
        <MarkdownRenderer :value="item.contentMarkdown" class="custom-markdown">
          <template #empty>
            <p class="whitespace-pre-wrap break-words">
              {{ item.content }}
            </p>
          </template>
        </MarkdownRenderer>
        <div v-if="item.images && item.images.length" class="flex flex-col gap-5">
          <HanaImgViewer
            v-for="image in item.images"
            :key="image"
            :src="image"
            thumbnail-class="mx-auto max-h-[78dvh]"
            thumbnail-style="width: auto;"
          />
        </div>
        <RecentlyMusicCard v-if="item.music && item.music.length > 0" :music="item.music" />
      </main>
      <footer class="py-5">
        <Comment type="recently" :path="activityPath" />
      </footer>
    </div>
  </HanaDialog>
</template>
