<script lang="ts" setup>
import type { Track } from '~/types/activity'

const isIdle = ref(true)
const showPlaying = ref(false)
const currentTrack = ref<Track | null>(null)

onMounted(() => {
  const { $audioPlayer } = useNuxtApp()
  onUnmounted($audioPlayer.subscribe((state) => {
    currentTrack.value = state.currentTrack
    isIdle.value = state.playbackState === 'idle'
  }))
})

function togglePlaying() {
  showPlaying.value = !showPlaying.value
}
</script>

<template>
  <div v-if="!isIdle" class="relative hana-card transition-all duration-300">
    <HanaTooltip content="正在播放" position="left" animation="slide">
      <div class="size-10 hana-button items-center justify-center" @click="togglePlaying">
        <Icon class="absolute" name="lucide:audio-lines" size="20" />
      </div>
    </HanaTooltip>

    <HanaDialog v-model="showPlaying" title="正在播放" width="800px">
      <RecentlyMusicCard v-if="currentTrack" :music="[currentTrack]" />
    </HanaDialog>
  </div>
</template>
