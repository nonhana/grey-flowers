<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h4 :id="id" class="w-fit with-underline text-xl">
    <NuxtLink :to="`#${id}`" :aria-label="`锚点链接：${id}`" class="hana-article-title">
      <slot />
    </NuxtLink>
  </h4>
</template>
