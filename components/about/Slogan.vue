<script setup lang="ts">
const sloganContainerRef = ref<HTMLElement | null>(null)

let observer: IntersectionObserver | null = null

function handleVisibilityChange(isVisible: boolean, children: HTMLCollection) {
  Array.from(children).forEach((child, index) => {
    setTimeout(() => {
      child.classList.toggle('blur-md', !isVisible)
    }, isVisible ? index * 600 : 0)
  })
}

function createObserver() {
  if (!sloganContainerRef.value)
    return

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const children = sloganContainerRef.value?.children
      if (children) {
        handleVisibilityChange(entry.isIntersecting, children)
      }
    })
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.5,
  })

  observer.observe(sloganContainerRef.value)
}

onMounted(() => {
  createObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div ref="sloganContainerRef" class="flex flex-col gap-5 text-center">
    <span class="blur-md transition-all duration-300">「愛する人を失った世界には、どんな色の花が咲く？」</span>
    <span class="blur-md transition-all duration-300">「在灰色的世界里，一切色彩都将失去意义。」</span>
    <span class="blur-md transition-all duration-300">「因此，不要为每一件事都赋予意义，是一种最巧妙的逃避方式。」</span>
  </div>
</template>
