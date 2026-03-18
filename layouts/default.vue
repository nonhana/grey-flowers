<script setup lang="ts">
import HanaScrollView from '~/components/hana/ScrollView.vue'
import { useStore } from '~/store'

const route = useRoute()
const { headerStatusStore, uiInfoStore } = useStore()
useRouterOptions()

const isHome = computed(() => route.fullPath === '/')
const isThoughts = computed(() => route.fullPath === '/thoughts')
const headerTop = computed(() => headerStatusStore.hidden ? '-100px' : '0px')

const scrollViewRef = useTemplateRef('scrollViewRef')

watchEffect(() => {
  if (scrollViewRef.value) {
    uiInfoStore.setScrollHeight(scrollViewRef.value.contentHeight)
    uiInfoStore.setClientHeight(scrollViewRef.value.containerHeight)
  }
})
</script>

<template>
  <div>
    <HanaScrollView
      ref="scrollViewRef"
      container-id="global-scroll-view"
      content-wrapper-id="global-scroll-view-wrapper"
      class="h-dvh"
      content-class="min-h-dvh flex flex-col"
      @scroll="uiInfoStore.setScrollTop($event)"
    >
      <transition name="banner">
        <MainBanner v-if="isHome" />
      </transition>
      <header
        class="sticky top-0 z-20 w-full transition-all"
        :style="{ transform: `translateY(${headerTop})` }"
      >
        <MainHeader />
      </header>
      <main class="flex-1">
        <div class="mx-auto flex-1 p-8 md:max-w-[90%] xl:max-w-[70%]">
          <slot />
        </div>
      </main>
      <footer v-if="!isThoughts" class="bg-primary-100 dark:bg-hana-black-800">
        <MainFooter />
      </footer>
    </HanaScrollView>
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
