<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h3 :id="id" class="w-fit text-2xl with-underline">
    <NuxtLink :to="`#${id}`" class="hana-article-title">
      <slot />
    </NuxtLink>
  </h3>
</template>
