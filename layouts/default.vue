<script setup lang="ts">
const route = useRoute()
const { fullPath } = toRefs(route)
const isHome = computed(() => fullPath.value === '/')
</script>

<template>
  <div class="min-h-screen font-noto">
    <MainBanner v-if="isHome" />
    <header class="sticky top-0 z-50 w-full">
      <MainHeader />
    </header>
    <main class="mx-auto p-8 md:max-w-[80%] lg:max-w-[70%]">
      <slot />
    </main>
  </div>
</template>
