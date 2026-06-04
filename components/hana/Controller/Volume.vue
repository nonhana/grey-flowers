<script lang="ts" setup>
import { Volume, Volume1, Volume2, VolumeOff } from '@lucide/vue'

const props = defineProps<{
  volume: number
  isMuted: boolean
}>()

const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')

const panelId = 'hana-volume-controller-panel'
const isFinePointer = computed(() => canHover.value)
const volumePercent = computed(() => Math.round(props.volume * 100))
const volumeLabel = computed(() => `${volumePercent.value}%`)
const muteButtonLabel = computed(() => props.isMuted ? '取消静音' : '静音')
const triggerLabel = computed(() => `音量控制，当前 ${volumeLabel.value}`)
const volumeIcon = computed(() => {
  if (props.isMuted) {
    return VolumeOff
  }

  if (props.volume === 0) {
    return Volume
  }

  if (props.volume <= 0.5) {
    return Volume1
  }

  return Volume2
})

function toggleMuted() {
  const { $audioPlayer } = useNuxtApp()
  $audioPlayer.setMuted(!props.isMuted)
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const nextVolume = target.valueAsNumber

  if (Number.isNaN(nextVolume)) {
    return
  }

  const { $audioPlayer } = useNuxtApp()
  if (props.isMuted) {
    $audioPlayer.setMuted(false)
  }

  $audioPlayer.setVolume(nextVolume)
}
</script>

<template>
  <HanaDropdown
    position="left"
    offset="end"
    trigger="auto"
    animation="slide"
    :show-arrow="false"
  >
    <template #default="{ visible }">
      <div class="relative hana-card">
        <button
          type="button"
          :aria-label="triggerLabel"
          :title="triggerLabel"
          aria-haspopup="dialog"
          :aria-expanded="visible ? 'true' : 'false'"
          :aria-controls="panelId"
          class="size-10 hana-button items-center justify-center focus-visible:ring-2 focus-visible:ring-hana-blue-300"
          :class="{
            'bg-hana-blue-150 text-hana-blue dark:bg-hana-black-800 dark:text-hana-white-700': visible,
          }"
        >
          <component :is="volumeIcon" :size="20" />
        </button>
      </div>
    </template>

    <template #dropdown>
      <div
        :id="panelId"
        class="text-left"
        :class="isFinePointer ? 'w-15 p-2.5!' : 'w-[12.75rem] max-w-[calc(100vw-5rem)] p-3!'"
      >
        <div v-if="isFinePointer" class="flex flex-col items-center gap-2.5">
          <p class="text-[11px] text-text font-medium tabular-nums dark:text-hana-white-700">
            {{ volumeLabel }}
          </p>
          <input
            class="volume-slider-vertical volume-slider-base h-22 w-2.5 cursor-ns-resize"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="props.volume"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="volumePercent"
            aria-label="音量"
            :style="`--volume-progress: ${props.volume}`"
            @input="handleInput"
          >
          <button
            type="button"
            :aria-label="muteButtonLabel"
            class="size-9 hana-button items-center justify-center focus-visible:ring-2 focus-visible:ring-hana-blue-300"
            :class="{
              'bg-hana-blue-150 text-hana-blue dark:bg-hana-black-800 dark:text-hana-white-700': props.isMuted,
            }"
            @click="toggleMuted"
          >
            <component :is="volumeIcon" :size="20" />
          </button>
        </div>

        <div v-else class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2">
          <button
            type="button"
            :aria-label="muteButtonLabel"
            class="row-span-2 size-9 hana-button items-center self-center justify-center focus-visible:ring-2 focus-visible:ring-hana-blue-300"
            :class="{
              'bg-hana-blue-150 text-hana-blue dark:bg-hana-black-800 dark:text-hana-white-700': props.isMuted,
            }"
            @click="toggleMuted"
          >
            <component :is="volumeIcon" :size="20" />
          </button>
          <span class="text-[11px] text-text-1 font-medium tracking-[0.08em] dark:text-hana-white-700/85">音量</span>
          <span class="justify-self-end text-xs text-text font-medium tabular-nums dark:text-hana-white-700">{{ volumeLabel }}</span>
          <input
            class="volume-slider-horizontal volume-slider-base col-span-2 h-2.5 w-full cursor-ew-resize"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="props.volume"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="volumePercent"
            aria-label="音量"
            :style="`--volume-progress: ${props.volume}`"
            @input="handleInput"
          >
        </div>
      </div>
    </template>
  </HanaDropdown>
</template>
