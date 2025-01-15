<script setup lang="ts">
import { recentlyPageData } from '~/data/meta'

useHead({
  title: recentlyPageData.title,
  meta: [
    {
      name: 'description',
      content: recentlyPageData.description,
    },
  ],
})
</script>

<template>
  <HanaInfoCard title="最近动态" icon="lucide:activity">
    <RecentlyContainer />
  </HanaInfoCard>
</template>
