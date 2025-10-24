<script setup lang="ts">
import { useStore } from '~/store'

const props = defineProps<{
  scrollTop: number // 当前整个容器的滚动偏移量，只接收不修改
  scrollHeight: number
  clientHeight: number
}>()

const { dialogStore } = useStore()
const { dialogCount } = toRefs(dialogStore)

const route = useRoute()
const { path } = toRefs(route)

const { progress } = useLoadingIndicator()
const canScroll = ref(false)

watchEffect(() => {
  canScroll.value = props.scrollHeight > props.clientHeight
})

const curScrollPercent = computed(() => {
  const percent = Math.ceil((props.scrollTop / (props.scrollHeight - props.clientHeight)) * 100)
  return Math.min(percent, 100)
})

const showPercent = ref(true)
function toggleShowPercent() {
  showPercent.value = !showPercent.value
}

const commentWhiteList = ['/recently'] // 在白名单中的路径不显示评论

const hasComments = ref(false)

function checkCommentsExistence() {
  if (commentWhiteList.includes(path.value))
    return null
  const commentsElement = document.querySelector('#comments')
  hasComments.value = !!commentsElement
  return commentsElement
}

onMounted(() => {
  setTimeout(() => {
    checkCommentsExistence()
  }, 300)
})

watch(progress, (newV) => {
  if (newV === 100) {
    setTimeout(() => {
      checkCommentsExistence()
    }, 300)
  }
})

function scrollToComments() {
  const commentsElement = checkCommentsExistence()
  if (commentsElement) {
    commentsElement.scrollIntoView({ behavior: 'smooth' })
  }
}

function scrollToTop() {
  const contentWrapper = document.getElementById('global-scroll-view-wrapper')
  if (contentWrapper) {
    contentWrapper.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
}

const isIdle = ref(true)

onMounted(() => {
  const { $audioPlayer } = useNuxtApp()
  onUnmounted($audioPlayer.subscribe(state => isIdle.value = state.playbackState === 'idle'))
})

const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

const isMobile = ref(false)
if (import.meta.client) {
  const { width: windowWidth } = useWindowSize()
  watchEffect(() => {
    isMobile.value = windowWidth.value < 1280
  })
}
const isArticlePage = computed(() => route.name === 'article-detail')
</script>

<template>
  <transition-group name="controller" tag="div" class="fixed bottom-10 right-10 z-10 flex flex-col gap-4">
    <HanaControllerVolume v-if="dialogCount === 0 && !isIdle" key="volume" />

    <div v-if="dialogCount === 0 && hasComments" key="comments" class="relative hana-card">
      <HanaTooltip content="滚到评论" position="left" animation="slide">
        <div class="size-10 hana-button items-center justify-center font-bold" @click="scrollToComments">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 12h.01" />
            <path d="M12 12h.01" />
            <path d="M16 12h.01" />
          </svg>
        </div>
      </HanaTooltip>
    </div>

    <div v-if="dialogCount === 0 && canScroll" key="to-top" class="relative hana-card">
      <HanaTooltip content="返回顶部" position="left" animation="slide">
        <div
          class="size-10 hana-button items-center justify-center font-bold"
          @click="scrollToTop"
          @mouseenter="toggleShowPercent"
          @mouseleave="toggleShowPercent"
        >
          <span class="absolute" :class="{ 'opacity-0': !showPercent }">{{ curScrollPercent }}%</span>
          <svg class="absolute" :class="{ 'opacity-0': showPercent }" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l7-7l7 7m-7 7V5" />
          </svg>
        </div>
      </HanaTooltip>
    </div>

    <div v-if="isClient && dialogCount === 0 && isArticlePage && isMobile" key="article-drawer">
      <ClientOnly>
        <HanaControllerArticleDrawer />
      </ClientOnly>
    </div>
  </transition-group>
</template>

<style scoped>
.controller-move,
.controller-enter-active,
.controller-leave-active {
  transition: all 0.3s ease;
}

.controller-enter-from,
.controller-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.controller-leave-active {
  position: absolute;
}
</style>
