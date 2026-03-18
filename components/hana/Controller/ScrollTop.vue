<script lang="ts" setup>
import { useStore } from '~/store'

const { dialogStore, globalScrollStore } = useStore()
const { scrollTop, scrollHeight, clientHeight } = toRefs(globalScrollStore)

const canScroll = ref(false)

watchEffect(() => {
  canScroll.value = scrollHeight.value > clientHeight.value
})

const visible = computed(() => dialogStore.dialogCount === 0 && canScroll.value)

const curScrollPercent = computed(() => {
  const percent = Math.ceil((
    scrollTop.value / (scrollHeight.value - clientHeight.value)
  ) * 100)
  return Math.min(percent, 100)
})

const showPercent = ref(true)
function toggleShowPercent() {
  showPercent.value = !showPercent.value
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
  <div v-if="visible" class="relative hana-card">
    <HanaTooltip content="返回顶部" position="left" animation="slide">
      <div
        class="size-10 hana-button items-center justify-center font-bold"
        @click="scrollToTop"
        @mouseenter="toggleShowPercent"
        @mouseleave="toggleShowPercent"
      >
        <span class="absolute" :class="{ 'opacity-0': !showPercent }">{{ curScrollPercent }}%</span>
        <svg class="absolute" :class="{ 'opacity-0': showPercent }" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l7-7l7 7m-7 7V5" />
        </svg>
      </div>
    </HanaTooltip>
  </div>
</template>
