<script setup lang="ts">
defineProps<{
  title: string
  icon: string
}>()
</script>

<template>
  <div>
    <div class="mb-6 flex items-center gap-2 text-2xl text-text dark:text-hana-white-700">
      <Icon :name="icon" size="32" />
      <span>
        {{ title }}
      </span>
    </div>
    <slot />
  </div>
</template>
