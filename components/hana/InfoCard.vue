<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  icon: string
  to: string
}>(), {})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center gap-2 text-2xl text-text">
      <Icon :name="icon" size="32" />
      <NuxtLink :to="to" class="with-underline">
        {{ title }}
      </NuxtLink>
    </div>
    <div>
      <slot />
    </div>
  </div>
</template>
