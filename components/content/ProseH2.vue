<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h2 :id="id" class="w-fit text-3xl with-underline">
    <NuxtLink :to="`#${id}`" class="hana-article-title">
      <slot />
    </NuxtLink>
  </h2>
</template>
