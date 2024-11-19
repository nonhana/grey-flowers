<script setup lang="ts">
const props = withDefaults(defineProps<{
  total: number
  pageSize?: number
}>(), {
  pageSize: 6,
})

const { total, pageSize } = toRefs(props)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

const currentPage = defineModel<number>({ default: 1 })

function stepPage(type: 'prev' | 'next') {
  if (type === 'prev') {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }
  else {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }
}

function goToPage(page: number) {
  currentPage.value = page
}
</script>

<template>
  <div class="hana-card flex w-fit gap-2">
    <HanaButton
      icon-button
      icon="lucide:chevron-left"
      :disabled="currentPage === 1"
      @click="stepPage('prev')"
    />
    <HanaButton
      v-for="page in totalPages"
      :key="page"
      :active="page === currentPage"
      icon-button
      @click="goToPage(page)"
    >
      <span class="size-5">
        {{ page }}
      </span>
    </HanaButton>
    <HanaButton
      icon-button
      icon="lucide:chevron-right"
      :disabled="currentPage === totalPages"
      @click="stepPage('next')"
    />
  </div>
</template>
