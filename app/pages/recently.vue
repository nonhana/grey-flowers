<script setup lang="ts">
import { Activity } from '@lucide/vue'
import { recentlyPageData } from '#shared/data/meta'

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
  <HanaInfoCard title="最近动态" :icon="Activity">
    <RecentlyContainer />
  </HanaInfoCard>
</template>
