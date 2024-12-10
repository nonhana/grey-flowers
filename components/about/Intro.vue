<script setup lang="ts">
const { data: about } = await useAsyncData('article-about', () => queryContent('/about').findOne())
</script>

<template>
  <ContentRenderer v-if="about" :value="about" class="flex flex-col gap-4 leading-7" />
</template>
