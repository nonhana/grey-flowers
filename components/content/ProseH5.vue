<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h5 :id="id" class="w-fit text-lg with-underline">
    <NuxtLink :to="`#${id}`" class="hana-article-title">
      <slot />
    </NuxtLink>
  </h5>
</template>
