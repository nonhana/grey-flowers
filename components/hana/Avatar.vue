<script setup lang="ts">
defineProps<{
  avatar: string | null
  username: string
  size: number
}>()
</script>

<template>
  <NuxtImg
    v-if="avatar"
    :src="avatar"
    class="cursor-pointer rounded-full"
    :style="{ width: `${size / 4}rem`, height: `${size / 4}rem` }"
  />
  <div
    v-else
    class="flex cursor-pointer select-none items-center justify-center rounded-full bg-hana-blue text-xl text-white"
    :style="{ width: `${size / 4}rem`, height: `${size / 4}rem` }"
  >
    <span>{{ username[0] }}</span>
  </div>
</template>
