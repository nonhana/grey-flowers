<script setup lang="ts">
const props = defineProps<{
  scrollHeight: number
  clientHeight: number
}>()

const { scrollHeight, clientHeight } = toRefs(props)

const { progress } = useLoadingIndicator()
const canScroll = ref(false)

watchEffect(() => {
  canScroll.value = scrollHeight.value > clientHeight.value
})

const scrollTop = defineModel<number>({ required: true })

const curScrollPercent = computed(() => {
  const percent = Math.ceil((scrollTop.value / (scrollHeight.value - clientHeight.value)) * 100)
  return Math.min(percent, 100)
})

function backToTop() {
  scrollTop.value = 0
}

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
  if (!commentsElement)
    return

  const scrollViewContent = document.querySelector('#global-scroll-view') as HTMLElement

  let elementOffsetTop = 0
  let element = commentsElement as HTMLElement

  while (element && element !== scrollViewContent && element.offsetParent) {
    elementOffsetTop += element.offsetTop
    element = element.offsetParent as HTMLElement
  }

  // 加一点缓冲区，让评论区不会紧贴顶部
  scrollTop.value = Math.max(0, elementOffsetTop - 20)
}
</script>

<template>
  <transition name="page">
    <div v-if="hasComments" class="hana-card fixed bottom-32 right-10 hidden xl:block">
      <HanaTooltip content="滚到评论" position="left" animation="slide">
        <div class="hana-button size-10 items-center justify-center font-bold" @click="scrollToComments">
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
    <div v-if="canScroll" class="hana-card fixed bottom-10 right-10 hidden xl:block">
      <HanaTooltip content="返回顶部" position="left" animation="slide">
        <div
          class="hana-button size-10 items-center justify-center font-bold"
          @click="backToTop"
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
