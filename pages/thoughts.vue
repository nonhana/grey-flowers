<script setup lang="ts">
const newMsgId = ref<number>()

function handlePublished(id: number | undefined) {
  newMsgId.value = id
}

function handleRefreshed() {
  newMsgId.value = undefined
}
</script>

<template>
  <div class="relative size-full overflow-auto">
    <ThoughtsMessages :new-msg-id="newMsgId" @refreshed="handleRefreshed" />
    <ThoughtsInput @published="handlePublished" />
  </div>
</template>
