<script lang="ts" setup>
import type { MusicTrack } from '@grey-flowers/contracts'
import { CircleStop, Pause, Play, SkipBack, SkipForward } from '@lucide/vue'

const props = defineProps<{
  music: MusicTrack[]
}>()

const { $audioPlayer } = useNuxtApp()

const curMusicIndex = ref(0)
const curMusic = computed(() => props.music[curMusicIndex.value]!)
const meta = computed(() => [curMusic.value.artist, curMusic.value.album].filter(Boolean).join(' · '))
const isFirstTrack = computed(() => curMusicIndex.value === 0)
const isLastTrack = computed(() => curMusicIndex.value === props.music.length - 1)

const globalCurTrack = shallowRef<MusicTrack | null>(null)
const globalCurTime = ref(0)
const globalIsPlaying = ref(false)

onUnmounted($audioPlayer.subscribe((state) => {
  globalCurTrack.value = state.currentTrack
  globalCurTime.value = state.currentTime
  globalIsPlaying.value = state.isPlaying
}))

const isCurTrackActive = computed(() => globalCurTrack.value?.id === curMusic.value.id)

const isPlaying = computed(() => isCurTrackActive.value && globalIsPlaying.value)
const canStop = computed(() => isCurTrackActive.value)

const currentTime = computed({
  get: () => isCurTrackActive.value ? globalCurTime.value : 0,
  set: (val) => { globalCurTime.value = val },
})

watch(curMusic, (newTrack, oldTrack) => {
  const { $audioPlayer } = useNuxtApp()
  if (globalCurTrack.value?.id === oldTrack?.id) {
    $audioPlayer.loadAndPlay(newTrack)
  }
})

const inputtingProgress = ref(0)
const isSeeking = ref(false)

const currentProgress = computed(() =>
  isSeeking.value ? inputtingProgress.value : (currentTime.value / curMusic.value.seconds),
)
const progressPercent = computed(() => Math.round((currentProgress.value || 0) * 100))

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  inputtingProgress.value = target.valueAsNumber
}

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  inputtingProgress.value = target.valueAsNumber
  currentTime.value = Math.floor(inputtingProgress.value * curMusic.value.seconds)
  $audioPlayer.seek(currentTime.value)
  isSeeking.value = false
}

function togglePlayPause() {
  if (!isCurTrackActive.value) {
    $audioPlayer.loadAndPlay(curMusic.value)
  }
  else {
    $audioPlayer.togglePlayPause()
  }
}

function stopPlayback() {
  if (!canStop.value)
    return

  $audioPlayer.stop()
}

function stepMusic(type: 'prev' | 'next') {
  if (type === 'prev')
    curMusicIndex.value > 0 && curMusicIndex.value--
  else
    curMusicIndex.value < props.music.length - 1 && curMusicIndex.value++
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// 两侧时间按总时长的字符数定宽：进度条宽度不随 9:59 → 10:00 跳动
const timeWidth = computed(() => `${formatSeconds(curMusic.value.seconds).length}ch`)

onMounted(() => {
  $audioPlayer.registerMediaSessionHandlers({
    onPlay: () => {
      if (!isCurTrackActive.value) {
        $audioPlayer.loadAndPlay(curMusic.value)
      }
      else {
        $audioPlayer.play()
      }
    },
    onPause: () => {
      $audioPlayer.pause()
    },
    onPreviousTrack: () => stepMusic('prev'),
    onNextTrack: () => stepMusic('next'),
  })
})
</script>

<template>
  <div class="grid grid-cols-[4rem_minmax(0,1fr)] w-full items-center gap-x-3 gap-y-3 overflow-hidden border border-primary-300 rounded-xl bg-white p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:grid-rows-[auto_1fr] sm:gap-x-5 sm:gap-y-0 dark:border-hana-black-600 dark:bg-hana-black sm:p-5">
    <div class="col-start-1 row-start-1 size-16 sm:row-[1/span_2] sm:size-24">
      <HanaLazyImg
        :src="curMusic.cover"
        :alt="curMusic.album || curMusic.title"
        width="100%"
        height="100%"
        surface-class="rounded-lg"
        img-class="block size-full rounded-lg object-cover"
      />
    </div>
    <div class="col-start-2 row-start-1 min-w-0 flex flex-col gap-1 sm:self-start">
      <h3 class="truncate text-base font-bold leading-snug sm:text-lg dark:text-hana-white">
        {{ curMusic.title }}
      </h3>
      <p v-if="meta" class="truncate text-xs text-text font-code dark:text-hana-white-700">
        {{ meta }}
      </p>
    </div>
    <div class="grid col-[1/-1] row-start-3 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:col-start-3 sm:row-start-1 sm:flex sm:self-start sm:gap-2">
      <Transition
        enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
        enter-from-class="scale-90 opacity-0"
        leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
        leave-to-class="scale-90 opacity-0"
      >
        <hana-button
          v-if="canStop"
          class="col-start-1 justify-self-end"
          icon-button
          :icon="CircleStop"
          aria-label="停止播放"
          @click="stopPlayback"
        />
      </Transition>
      <div class="col-start-2 flex items-center gap-1">
        <hana-button
          v-if="music.length > 1"
          icon-button
          :icon="SkipBack"
          :disabled="isFirstTrack"
          aria-label="上一首"
          @click="stepMusic('prev')"
        />
        <hana-button
          dark-mode
          icon-button
          class="p-2.5!"
          :icon="isPlaying ? Pause : Play"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click="togglePlayPause"
        />
        <hana-button
          v-if="music.length > 1"
          icon-button
          :icon="SkipForward"
          :disabled="isLastTrack"
          aria-label="下一首"
          @click="stepMusic('next')"
        />
      </div>
    </div>
    <div
      class="col-[1/-1] row-start-2 flex items-center gap-3 text-xs text-text font-code tabular-nums sm:col-start-2 sm:self-end dark:text-hana-white-700"
      :style="{ '--time-width': timeWidth }"
    >
      <span class="min-w-[var(--time-width)]">{{ formatSeconds(currentTime) }}</span>
      <input
        class="music-progress [--fill:oklch(0.5_0.1102_250.04)] [--thumb-ring:oklch(0.84_0.0632_214.03)] [--track:oklch(0.93_0.0305_212.05)] min-w-0 flex-1 dark:[--fill:oklch(0.75_0.0883_226.04)] dark:[--thumb-ring:oklch(0.5_0.1102_250.04)] dark:[--track:oklch(0.41_0_0)]"
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
      <span class="min-w-[var(--time-width)] text-end">{{ formatSeconds(curMusic.seconds) }}</span>
    </div>
  </div>
</template>

<style scoped>
.music-progress {
  --thumb: 0.875rem;
  --filled: calc(var(--thumb) / 2 + var(--progress) * (100% - var(--thumb)));
  height: 1.5rem;
  margin: 0;
  appearance: none;
  background: transparent;
  outline: none;
  cursor: pointer;
}

.music-progress::-webkit-slider-runnable-track {
  height: 0.375rem;
  border-radius: 999px;
  background: linear-gradient(to right, var(--fill) var(--filled), var(--track) var(--filled));
}

.music-progress::-moz-range-track {
  height: 0.375rem;
  border-radius: 999px;
  background: linear-gradient(to right, var(--fill) var(--filled), var(--track) var(--filled));
}

.music-progress::-webkit-slider-thumb {
  width: var(--thumb);
  height: var(--thumb);
  margin-top: -0.25rem;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: var(--fill);
  transition: box-shadow 0.2s;
}

.music-progress::-moz-range-thumb {
  width: var(--thumb);
  height: var(--thumb);
  border: 0;
  border-radius: 50%;
  background: var(--fill);
  transition: box-shadow 0.2s;
}

.music-progress:hover::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px var(--track);
}

.music-progress:hover::-moz-range-thumb {
  box-shadow: 0 0 0 4px var(--track);
}

.music-progress:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px var(--thumb-ring);
}

.music-progress:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 4px var(--thumb-ring);
}
</style>
