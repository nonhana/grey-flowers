<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'zh-Hans',
  },
})
</script>

<template>
  <div class="bg-hana-blue-200/10 background-grid">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.layout-enter-active,
.layout-leave-active {
  transition: all 0.2s;
}
.layout-enter-from,
.layout-leave-to {
  opacity: 0;
}

html.dark{
  color-scheme: dark;
}
</style>
