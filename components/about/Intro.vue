
<script setup lang="ts">
const { data } = useAsyncData('about-article', () => queryCollection('content').path('/about').first())
</script>

<template>
  <ContentRenderer v-if="data" :value="data" class="flex flex-col gap-4 leading-7 dark:text-hana-white" />
</template>
