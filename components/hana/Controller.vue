<script setup lang="ts">
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
</script>

<template>
  <div class="hana-card fixed bottom-10 right-10 hidden xl:block">
    <HanaTooltip content="返回顶部" position="left" animation="slide">
      <div
        class="hana-button size-10 items-center justify-center font-bold"
        @click="backToTop"
        @mouseenter="toggleShowPercent"
        @mouseleave="toggleShowPercent"
      >
        <span v-if="showPercent">{{ curScrollPercent }}%</span>
        <Icon v-else name="lucide:arrow-up" size="24" />
      </div>
    </HanaTooltip>
  </div>
</template>
