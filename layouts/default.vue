<script setup lang="ts">
import { useStore } from '~/store'

const route = useRoute()
const { headerStatusStore } = useStore()

const { fullPath } = toRefs(route)

const isHome = computed(() => fullPath.value === '/')
const isThoughts = computed(() => fullPath.value === '/thoughts')

const headerTop = ref('0px')
let lastScrollY = 0

function handleScroll() {
  if (route.meta.name === 'article-detail') {
    const currentScrollY = window.scrollY
    if (currentScrollY > lastScrollY) {
      headerTop.value = '-100px'
      headerStatusStore.setHidden(true)
    }
    else {
      headerTop.value = '0px'
      headerStatusStore.setHidden(false)
    }
    lastScrollY = currentScrollY
  }
}

const debouncedHandleScroll = useThrottleFn(handleScroll, 50)

onMounted(() => {
  window.addEventListener('scroll', debouncedHandleScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', debouncedHandleScroll)
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <transition name="banner">
      <MainBanner v-if="isHome" />
    </transition>
    <header class="sticky top-0 z-20 w-full transition-all" :style="{ top: headerTop }">
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
