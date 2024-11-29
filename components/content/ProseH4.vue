<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h4 :id="id" class="w-fit text-xl with-underline">
    <NuxtLink :to="`#${id}`" class="hana-article-title">
      <slot />
    </NuxtLink>
  </h4>
</template>
