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
    <main>
      <div class="mx-auto p-8 md:max-w-[80%] lg:max-w-[70%]">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
main {
  position: relative;
  z-index: 1;
  overflow: hidden;
}

main::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/public/images/ende_nea.webp');
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(20px);
  scale: 1.5;
  z-index: -1;
}
</style>
