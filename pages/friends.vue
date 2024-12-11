<script setup lang="ts">
import { friendsPageData } from '~/data'

useHead({
  title: friendsPageData.title,
  meta: [
    {
      name: 'description',
      content: friendsPageData.description,
    },
  ],
})
</script>

<template>
  <div class="h-[1000px]">
    <span>这是 friends 页面</span>
  </div>
</template>
