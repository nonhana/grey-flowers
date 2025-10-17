<script setup lang="ts">
const props = defineProps<{
  scrollTop: number // 当前整个容器的滚动偏移量，只接收不修改
  scrollHeight: number
  clientHeight: number
}>()

const { scrollTop, scrollHeight, clientHeight } = toRefs(props)

const { progress } = useLoadingIndicator()
const canScroll = ref(false)

watchEffect(() => {
  canScroll.value = scrollHeight.value > clientHeight.value
})

const curScrollPercent = computed(() => {
  const percent = Math.ceil((scrollTop.value / (scrollHeight.value - clientHeight.value)) * 100)
  return Math.min(percent, 100)
})

const showPercent = ref(true)
function toggleShowPercent() {
  showPercent.value = !showPercent.value
}

const hasComments = ref(false)

function checkCommentsExistence() {
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
</script>

<template>
  <transition name="page">
    <HanaVolumeController />
  </transition>

  <transition name="page">
    <div v-if="hasComments" class="fixed bottom-32 right-10 hana-card hidden xl:block">
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
  </transition>

  <transition name="page">
    <div v-if="canScroll" class="fixed bottom-10 right-10 hana-card hidden xl:block">
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
  </transition>
</template>
