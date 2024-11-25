<script setup lang="ts">
const needRefresh = ref(false)

function handlePublished() {
  needRefresh.value = true
}

function handleRefreshed() {
  needRefresh.value = false
}
</script>

<template>
  <div class="w-full">
    <ThoughtsMessages :need-refresh="needRefresh" @refreshed="handleRefreshed" />
    <ThoughtsInput @published="handlePublished" />
  </div>
</template>
