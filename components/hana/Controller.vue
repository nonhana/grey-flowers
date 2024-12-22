<script setup lang="ts">
const { progress } = useLoadingIndicator()
const canScroll = ref(false)

onMounted(() => {
  setTimeout(() => {
    canScroll.value = hasScrollbar()
  }, 300)
})
watch(progress, (newV) => {
  if (newV === 100) {
    setTimeout(() => {
      canScroll.value = hasScrollbar()
    }, 300)
  }
})

const curScrollPercent = ref(0)

onMounted(() => {
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
    const clientHeight = document.documentElement.clientHeight || document.body.clientHeight
    curScrollPercent.value = Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100)
  })
})

function backToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const showPercent = ref(true)
function toggleShowPercent() {
  showPercent.value = !showPercent.value
}

const hasComments = ref(false)
let comments: Element | null

onMounted(() => {
  setTimeout(() => {
    comments = document.querySelector('#comments')
    comments ? hasComments.value = true : hasComments.value = false
  }, 300)
})
watch(progress, (newV) => {
  if (newV === 100) {
    setTimeout(() => {
      comments = document.querySelector('#comments')
      comments ? hasComments.value = true : hasComments.value = false
    }, 300)
  }
})

function scrollToComments() {
  if (comments) {
    comments.scrollIntoView({
      behavior: 'smooth',
    })
  }
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
