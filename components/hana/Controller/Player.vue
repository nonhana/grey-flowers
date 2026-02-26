<script lang="ts" setup>
import type { Track } from '~/types/activity'

const { $audioPlayer } = useNuxtApp()

const showPlaying = ref(false)
const currentTrack = ref<Track | null>(null)

onUnmounted($audioPlayer.subscribe((state) => {
  currentTrack.value = state.currentTrack
}))

function togglePlaying() {
  showPlaying.value = !showPlaying.value
}
</script>

<template>
  <div class="relative hana-card transition-all duration-300">
    <HanaTooltip content="正在播放" position="left" animation="slide">
      <div
        class="mt-auto size-10 hana-button items-end items-center justify-center font-bold"
        @click="togglePlaying"
      >
        <Icon name="lucide:audio-lines" size="20" />
      </div>
    </HanaTooltip>

    <HanaDialog v-model="showPlaying" title="正在播放" width="800px">
      <RecentlyMusicCard v-if="currentTrack" :music="[currentTrack]" />
    </HanaDialog>
  </div>
</template>
