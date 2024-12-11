<script setup lang="ts">
import { thoughtsPageData } from '~/data'

const newMsgId = ref<number>()

function handlePublished(id: number | undefined) {
  newMsgId.value = id
}

function handleRefreshed() {
  newMsgId.value = undefined
}

useHead({
  title: thoughtsPageData.title,
  meta: [
    {
      name: 'description',
      content: thoughtsPageData.description,
    },
  ],
})
</script>

<template>
  <div class="relative size-full overflow-auto">
    <ThoughtsMessages :new-msg-id="newMsgId" @refreshed="handleRefreshed" />
    <ThoughtsInput @published="handlePublished" />
  </div>
</template>
