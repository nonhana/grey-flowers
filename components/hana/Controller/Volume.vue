<script lang="ts" setup>
import { Volume, Volume1, Volume2, VolumeOff } from 'lucide-vue-next'

const volume = ref(0)

const isMuted = ref(false)

onMounted(() => {
  const { $audioPlayer } = useNuxtApp()

  const unsubscribeVolume = $audioPlayer.subscribe((state) => {
    volume.value = state.volume
    isMuted.value = state.isMuted
  })

  onUnmounted(() => {
    unsubscribeVolume()
  })
})

function toggleMuted() {
  const { $audioPlayer } = useNuxtApp()
  $audioPlayer.toggleMuted()
}

const showVolumePanel = ref(false)
const controllerHeight = computed(() => showVolumePanel.value ? '208px' : '56px')

function handleInput(e: Event) {
  const { $audioPlayer } = useNuxtApp()
  const target = e.target as HTMLInputElement
  $audioPlayer.setVolume(target.valueAsNumber)
}
</script>

<template>
  <div
    class="relative w-14 overflow-hidden hana-card transition-all duration-300"
    :style="{ height: controllerHeight }"
    @mouseenter="showVolumePanel = true"
    @mouseleave="showVolumePanel = false"
  >
    <div class="absolute bottom-2 flex flex-col items-center gap-4">
      <p class="text-xs text-text dark:text-hana-white-700">
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
        :disabled="isMuted"
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
        <div v-if="!isMuted">
          <Volume v-if="volume === 0" :size="20" />
          <Volume1 v-else-if="volume > 0 && volume <= 0.5" :size="20" />
          <Volume2 v-else-if="volume > 0.5 && volume <= 1" :size="20" />
        </div>
        <div v-else>
          <VolumeOff :size="20" />
        </div>
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
  writing-mode: vertical-lr;
  direction: rtl;
}

.dark {
  #volume-progress {
    background: linear-gradient(to right,
      oklch(0.75 0.0883 226.04) calc(var(--progress) * 100%),
      oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
    );
  }
}
</style>
