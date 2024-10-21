<script setup lang="ts">
const route = useRoute()
const { fullPath } = toRefs(route)
const isHome = computed(() => fullPath.value === '/')
</script>

<template>
  <div class="min-h-screen font-noto">
    <MainBanner v-if="isHome" />
    <header class="sticky top-0 w-full">
      <MainHeader />
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
