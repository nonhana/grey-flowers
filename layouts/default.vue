<script setup lang="ts">
const route = useRoute()
const { fullPath } = toRefs(route)
const isHome = computed(() => fullPath.value === '/')
</script>

<template>
  <div class="flex min-h-screen flex-col font-noto">
    <transition name="banner">
      <MainBanner v-if="isHome" />
    </transition>
    <header class="sticky top-0 z-10 w-full">
      <MainHeader />
    </header>
    <main class="flex-1">
      <div id="main-wrapper" class="relative mx-auto p-8 md:max-w-[90%] xl:max-w-[70%]">
        <slot />
      </div>
    </main>
    <footer class="bg-white">
      <MainFooter />
    </footer>
    <HanaController />
  </div>
</template>

<style scoped>
.banner-enter-from,
.banner-leave-to {
  height: 0;
  opacity: 0;
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.5s ease;
}

.banner-enter-to {
  height: 732px;
  opacity: 1;
}
</style>
