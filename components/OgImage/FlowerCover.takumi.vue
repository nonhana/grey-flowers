<script setup lang="ts">
const { title = 'My Page', description = '' } = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center bg-white p-[60px] text-neutral-900 dark:bg-neutral-900 dark:text-white">
    <h1 class="m-0 text-center text-[72px] font-bold leading-tight" style="text-wrap: balance;">
      {{ title }}
    </h1>
    <p v-if="description" class="mt-4 max-w-[900px] text-center text-[32px] opacity-60">
      {{ description }}
    </p>
  </div>
</template>
