<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'
import { HanaImgViewer } from 'hana-img-viewer'

const props = defineProps<{ item?: ActivityItem }>()

const visible = defineModel<boolean>()

const activityPath = computed(() => `/recently?id=${props.item?.id}`)
</script>

<template>
  <HanaDialog v-model="visible" title="动态详情" width="800px">
    <div v-if="!props.item">
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
            <time :datetime="props.item.publishedAt">{{ props.item.publishedAt }}</time>
          </span>
        </div>
      </header>
      <main class="my-5 text-black dark:text-hana-white">
        <p class="mb-5 whitespace-pre-wrap leading-6">
          {{ props.item.content }}
        </p>
        <div v-if="props.item.images && props.item.images.length" class="flex flex-col gap-5">
          <HanaImgViewer
            v-for="image in props.item.images"
            :key="image"
            :src="image"
            class="size-full cursor-pointer overflow-hidden rounded-xl object-cover"
            loading="lazy"
          />
        </div>
        <RecentlyMusicCard v-if="props.item?.music && props.item.music.length > 0" :music="props.item.music" />
      </main>
      <footer class="py-5">
        <Comment type="recently" :path="activityPath" />
      </footer>
    </div>
  </HanaDialog>
</template>
