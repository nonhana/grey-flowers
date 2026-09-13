<script lang="ts" setup>
import type { MusicTrack } from '@grey-flowers/contracts'
import { AudioLines } from '@lucide/vue'

defineProps<{
  currentTrack: MusicTrack | null
}>()

const showPlaying = ref(false)

function togglePlaying() {
  showPlaying.value = !showPlaying.value
}
</script>

<template>
  <div class="relative hana-card transition-all duration-300">
    <HanaTooltip content="正在播放" position="left" animation="slide">
      <div class="size-10 hana-button items-center justify-center" @click="togglePlaying">
        <AudioLines class="absolute" :size="20" />
      </div>
    </HanaTooltip>

    <HanaDialog v-model="showPlaying" title="正在播放" width="800px">
      <RecentlyMusicCard v-if="currentTrack" :music="[currentTrack]" />
    </HanaDialog>
  </div>
</template>
