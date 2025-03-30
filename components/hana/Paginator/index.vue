<script setup lang="ts">
const props = withDefaults(defineProps<{
  total: number
  pageSize?: number
  buttonCount?: number
}>(), {
  pageSize: 6,
  buttonCount: 5,
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

const maxButtonCount = props.buttonCount
const sideButtonCount = (maxButtonCount - 3) / 2
</script>

<template>
  <div class="hana-card flex w-fit gap-2">
    <HanaButton
      class="hidden md:block"
      icon-button
      icon="lucide:chevron-left"
      :disabled="currentPage === 1"
      @click="stepPage('prev')"
    />
    <HanaPaginatorButtons
      :current-page="currentPage"
      :total-pages="totalPages"
      :max-button-count="maxButtonCount"
      :side-button-count="sideButtonCount"
      @click="goToPage"
    />
    <HanaButton
      class="hidden md:block"
      icon-button
      icon="lucide:chevron-right"
      :disabled="currentPage === totalPages"
      @click="stepPage('next')"
    />
  </div>
</template>
