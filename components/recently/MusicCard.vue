<script lang="ts" setup>
import type { PlaybackState } from '~/lib/audioPlayer'
import type { Track } from '~/types/activity'

const props = defineProps<{
  music: Track[]
}>()

const { $audioPlayer } = useNuxtApp()

const curMusicIndex = ref(0)
const curMusic = computed(() => props.music[curMusicIndex.value]!)

// 页面初挂载时，只加载不播放
onMounted(() => {
  $audioPlayer.load(curMusic.value)
})

watch((curMusic), () => {
  $audioPlayer.loadAndPlay(curMusic.value)
})

// 进度条滑块的进度
const sliderProgress = ref(0)

// 是否正在拖拽进度条滑块
const isSeeking = ref(false)

const currentTime = ref(0)
const currentStatus = ref<PlaybackState>('idle')
$audioPlayer.subscribe((newState) => {
  currentTime.value = newState.currentTime
  currentStatus.value = newState.playbackState
})

const currentProgress = computed(() =>
  isSeeking.value ? sliderProgress.value : (currentTime.value / curMusic.value.seconds),
)

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  sliderProgress.value = target.valueAsNumber
}

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  sliderProgress.value = target.valueAsNumber
  const newTime = Math.floor(sliderProgress.value * curMusic.value.seconds)
  $audioPlayer.seek(newTime)
  isSeeking.value = false
}

const playIcon = computed(() => currentStatus.value === 'playing' ? 'lucide:pause' : 'lucide:play')

function stepMusic(type: 'prev' | 'next') {
  if (type === 'prev') {
    if (curMusicIndex.value > 0) {
      curMusicIndex.value--
    }
  }
  else {
    if (curMusicIndex.value < props.music.length - 1) {
      curMusicIndex.value++
    }
  }
}
</script>

<template>
  <div class="h-40 w-full flex items-center gap-2 overflow-hidden border-2 border-hana-blue rounded-lg py-2">
    <nuxt-img :src="curMusic.album.cover" :alt="curMusic.album.title" class="size-42 rounded-lg object-cover" />
    <div class="h-full flex flex-col justify-between">
      <h3>{{ curMusic.title }}</h3>
      <p>{{ curMusic.album.title }}</p>
      <div class="flex items-center gap-2">
        <hana-button :disabled="music.length === 1" icon-button icon="lucide:skip-back" @click="stepMusic('prev')" />
        <hana-button icon-button :icon="playIcon" @click="$audioPlayer.togglePlayPause()" />
        <hana-button :disabled="music.length === 1" icon-button icon="lucide:skip-forward" @click="stepMusic('next')" />
      </div>
      <input
        type="range"
        :disabled="currentStatus === 'idle'"
        min="0"
        max="1"
        step="0.001"
        :value="currentProgress"
        @input="handleInput"
        @change="handleChange"
        @pointerdown="isSeeking = true"
      >
    </div>
  </div>
</template>
