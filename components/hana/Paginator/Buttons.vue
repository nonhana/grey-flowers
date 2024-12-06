<script setup lang="ts">
const props = defineProps<{
  currentPage: number
  totalPages: number
  maxButtonCount: number
  sideButtonCount: number
}>()

const emits = defineEmits<{
  (e: 'click', page: number): void
}>()

const { currentPage, totalPages, maxButtonCount, sideButtonCount } = toRefs(props)

const isCompact = computed(() => totalPages.value > maxButtonCount.value)
const sanitizedCurrentPage = computed(() => Math.max(1, Math.min(currentPage.value, totalPages.value)))

const start = computed(() => {
  if (!isCompact.value)
    return 1
  if (sanitizedCurrentPage.value > totalPages.value - maxButtonCount.value + 2)
    return totalPages.value - maxButtonCount.value + 2
  return Math.max(sanitizedCurrentPage.value - sideButtonCount.value, 2)
})

const end = computed(() => {
  if (!isCompact.value)
    return totalPages.value
  if (sanitizedCurrentPage.value + 1 < maxButtonCount.value - 1)
    return maxButtonCount.value - 1
  return Math.min(sanitizedCurrentPage.value + sideButtonCount.value, totalPages.value - 1)
})

const pages = computed(() => {
  const pageArray: number[] = []
  for (let i = start.value; i <= end.value; i++) {
    pageArray.push(i)
  }
  return pageArray
})
</script>

<template>
  <transition-group name="buttons-container">
    <HanaButton
      v-if="start !== 1"
      :active="currentPage === 1"
      icon-button
      @click="emits('click', 1)"
    >
      <span class="size-5">1</span>
    </HanaButton>
    <HanaButton v-if="start > 2" icon="lucide:ellipsis" icon-button />
    <HanaButton
      v-for="page in pages"
      :key="page"
      :active="currentPage === page"
      icon-button
      @click="emits('click', page)"
    >
      <span class="size-5">{{ page }}</span>
    </HanaButton>
    <HanaButton v-if="end < totalPages - 1" icon="lucide:ellipsis" icon-button />
    <HanaButton
      v-if="end !== totalPages && totalPages > 1"
      :active="currentPage === totalPages"
      icon-button
      @click="emits('click', totalPages)"
    >
      <span class="size-5">{{ totalPages }}</span>
    </HanaButton>
  </transition-group>
</template>

<style scoped>
.buttons-container-move,
.buttons-container-enter-active,
.buttons-container-leave-active {
  transition: all 0.3s ease;
}

.buttons-container-enter-from,
.buttons-container-leave-to {
  opacity: 0;
}

.buttons-container-leave-active {
  position: absolute;
}
</style>
