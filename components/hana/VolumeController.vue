<script lang="ts" setup>
const isIdle = ref(true)
const volume = ref(0)
const previousVolume = ref(0)

const volumeIcon = computed(() =>
  volume.value > 0.5 ? 'lucide:volume-2' : volume.value > 0 ? 'lucide:volume-1' : 'lucide:volume-off',
)

onMounted(() => {
  const { $audioPlayer } = useNuxtApp()

  const unsubscribeIdle = $audioPlayer.subscribe((state) => {
    isIdle.value = state.playbackState === 'idle'
  })

  const unsubscribeVolume = $audioPlayer.subscribe((state) => {
    volume.value = state.volume
  })

  onUnmounted(() => {
    unsubscribeIdle()
    unsubscribeVolume()
  })
})

function toggleMuted() {
  const { $audioPlayer } = useNuxtApp()
  if ($audioPlayer.getState().isMuted) {
    $audioPlayer.setVolume(previousVolume.value)
  }
  else {
    previousVolume.value = volume.value
    $audioPlayer.setVolume(0)
  }
}

const showVolumePanel = ref(false)
function toggleShowVolumePanel() {
  showVolumePanel.value = !showVolumePanel.value
}

const controllerHeight = computed(() => showVolumePanel.value ? '208px' : '56px')

function handleInput(e: Event) {
  const { $audioPlayer } = useNuxtApp()
  const target = e.target as HTMLInputElement
  $audioPlayer.setVolume(target.valueAsNumber)
}
</script>

<template>
  <div
    v-if="!isIdle"
    class="fixed bottom-54 right-10 w-14 overflow-hidden hana-card transition-all duration-300 hidden xl:block"
    :style="{ height: controllerHeight }"
    @mouseenter="toggleShowVolumePanel"
    @mouseleave="toggleShowVolumePanel"
  >
    <div class="absolute bottom-2 flex flex-col items-center gap-4">
      <p class="text-xs text-text">
        {{ Math.round(volume * 100) }}%
      </p>
      <input
        id="volume-progress"
        class="h-24 w-2 rounded outline-none transition-[box-shadow] duration-200 accent-hana-blue dark:bg-hana-black-700 focus-visible:ring-2 focus-visible:ring-hana-blue-300"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        :aria-valuemin="0"
        :aria-valuemax="1"
        :aria-valuenow="volume"
        aria-label="音量"
        :style="`--progress: ${volume}`"
        @input="handleInput"
      >
      <div
        class="mt-auto size-10 hana-button items-end items-center justify-center font-bold"
        @click="toggleMuted"
      >
        <icon :name="volumeIcon" size="20" />
      </div>
    </div>
  </div>
</template>

<style scoped>
#volume-progress {
  background: linear-gradient(to right,
    oklch(0.5 0.1102 250.04) calc(var(--progress) * 100%),
    oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
  );
  appearance: slider-vertical;
  writing-mode: bt-lr;
}
</style>
