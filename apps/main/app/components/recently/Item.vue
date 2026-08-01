<script setup lang="ts">
import type { ActivityItem } from '#shared/types/activity'
import { AtSign, Clock, ExternalLink, MessageCircle } from '@lucide/vue'
import { hanaInfo } from '~/utils/constants'

const props = defineProps<{
  item: ActivityItem
  index: number
}>()

const router = useRouter()

const opacity = ref(0)
const top = ref('10px')

const transitionDelay = computed(() => `${(props.index % 20) * 0.1}s`)
const transitionStyle = computed(() => `all 0.2s ${transitionDelay.value}`)

onMounted(() => {
  floatAnimation(opacity, top)
})

function gotoDetail() {
  router.push(`/recently?id=${props.item.id}`)
}
</script>

<template>
  <div
    class="hana-card p-5!"
    :data-recently-activity-id="item.id"
    :style="{ transition: transitionStyle, opacity, transform: `translateY(${top})` }"
  >
    <header class="flex justify-between">
      <div class="flex items-center gap-2">
        <HanaAvatar :size="10" :avatar="hanaInfo.avatar" :username="hanaInfo.username" :site="hanaInfo.site" :show-info="false" />
        <div class="flex flex-col gap-1">
          <span class="text-black font-bold dark:text-hana-white">{{ hanaInfo.username }}</span>
          <span class="flex items-center text-sm text-text dark:text-hana-white-700 space-x-1">
            <Clock :size="14" />
            <time :datetime="item.publishedAt">{{ item.publishedAt }}</time>
          </span>
        </div>
      </div>
      <HanaTooltip content="查看原文" animation="slide">
        <HanaButton icon-button :icon="ExternalLink" aria-label="查看原文" @click="gotoDetail" />
      </HanaTooltip>
    </header>
    <main class="my-5 text-black dark:text-hana-white space-y-5">
      <p class="whitespace-pre-wrap leading-6 line-clamp-6">
        {{ item.content }}
      </p>
      <RecentlyPhotoGrid :images="item.images" @click="gotoDetail" />
      <RecentlyMusicCard v-if="item.music && item.music.length > 0" :music="item.music" />
    </main>
    <footer class="flex items-center justify-between border-t border-primary pt-5 text-text dark:text-hana-white-700">
      <span class="flex items-center space-x-1">
        <AtSign :size="14" />
        <span>{{ item.id }}</span>
      </span>
      <HanaTooltip content="点击评论" animation="slide">
        <HanaButton :icon="MessageCircle" @click="gotoDetail">
          {{ item.commentCount }}
        </HanaButton>
      </HanaTooltip>
    </footer>
  </div>
</template>
