<script lang="ts" setup>
import type { Track } from '~/types/activity'
import { audioPlayer } from '~/lib/audioPlayer'

defineProps<{
  item: Track
}>()
</script>

<template>
  <div>
    <nuxt-img :src="item.album.cover" :alt="item.album.title" class="size-full object-cover" />
  </div>
</template>
