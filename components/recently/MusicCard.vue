<script lang="ts" setup>
import type { Track } from '~/types/activity'

const props = defineProps<{
  music: Track[]
}>()

const { $audioPlayer } = useNuxtApp()

const curMusicIndex = ref(0) // 当前播放的歌曲索引
const curMusic = computed(() => props.music[curMusicIndex.value]!) // 拿到当前播放的歌曲

watch((curMusic), () => $audioPlayer.loadAndPlay(curMusic.value))

const inputtingProgress = ref(0) // 用户正在拖动进度条滑块时的进度
const isSeeking = ref(false) // 是否正在拖拽进度条滑块

const currentTime = ref(0) // 双向绑定：组件可控制 currentTime，立即同步状态到 AudioPlayer 实例；反之亦然
onUnmounted($audioPlayer.subscribe(state => currentTime.value = state.currentTime))

const isPlaying = ref(false) // 单向：从 AudioPlayer 实例获取
onUnmounted($audioPlayer.subscribe(state => isPlaying.value = state.isPlaying))

const currentProgress = computed(() =>
  isSeeking.value ? inputtingProgress.value : (currentTime.value / curMusic.value.seconds),
)
const progressPercent = computed(() => Math.round((currentProgress.value || 0) * 100))

// 拖拽进度条，触发 input 事件
function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  inputtingProgress.value = target.valueAsNumber
}

// 松开进度条滑块，触发 change 事件（submit）
function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  inputtingProgress.value = target.valueAsNumber
  currentTime.value = Math.floor(inputtingProgress.value * curMusic.value.seconds)
  $audioPlayer.seek(currentTime.value)
  isSeeking.value = false
}

const playIcon = computed(() => isPlaying.value ? 'lucide:pause' : 'lucide:play')

function togglePlayPause() {
  if ($audioPlayer.getState().playbackState === 'idle') {
    $audioPlayer.loadAndPlay(curMusic.value)
  }
  else {
    $audioPlayer.togglePlayPause()
  }
}

function stepMusic(type: 'prev' | 'next') {
  if (type === 'prev')
    curMusicIndex.value > 0 && curMusicIndex.value--
  else
    curMusicIndex.value < props.music.length - 1 && curMusicIndex.value++
}
</script>

<template>
  <div class="w-full flex flex-col gap-3 overflow-hidden border border-hana-blue-200 rounded-lg bg-hana-blue-200/10 p-4 sm:flex-row sm:items-center">
    <nuxt-img
      :src="curMusic.album.cover"
      :alt="curMusic.album.title"
      class="aspect-video w-full rounded-lg object-cover sm:aspect-square sm:size-42"
    />
    <div class="min-w-0 flex flex-1 flex-col gap-3">
      <div class="min-w-0 flex flex-col gap-1">
        <h3 class="truncate text-base font-bold leading-snug md:text-lg">
          {{ curMusic.title }}
        </h3>
        <p class="truncate text-sm text-text-3">
          {{ curMusic.album.title }}
        </p>
      </div>
      <div class="mx-auto flex items-center gap-4">
        <hana-button
          :disabled="music.length === 1"
          icon-button
          icon="lucide:skip-back"
          aria-label="上一首"
          @click="stepMusic('prev')"
        />
        <hana-button
          icon-button
          :icon="playIcon"
          aria-label="播放/暂停"
          @click="togglePlayPause"
        />
        <hana-button
          :disabled="music.length === 1"
          icon-button
          icon="lucide:skip-forward"
          aria-label="下一首"
          @click="stepMusic('next')"
        />
      </div>
      <input
        id="music-progress"
        class="h-2 appearance-none rounded outline-none transition-[box-shadow] duration-200 accent-hana-blue dark:bg-hana-black-700 focus-visible:ring-2 focus-visible:ring-hana-blue-300"
        type="range"
        min="0"
        max="1"
        step="0.001"
        :value="currentProgress"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="progressPercent"
        aria-label="播放进度"
        :style="`--progress: ${currentProgress}`"
        @input="handleInput"
        @change="handleChange"
        @pointerdown="isSeeking = true"
      >
      <div class="w-full flex items-center justify-between text-xs text-text tabular-nums">
        <p>{{ formatTime(currentTime) }}</p>
        <p>{{ formatTime(curMusic.seconds) }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
#music-progress {
  background: linear-gradient(to right,
    oklch(0.5 0.1102 250.04) calc(var(--progress) * 100%),
    oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
  );
}
</style>
