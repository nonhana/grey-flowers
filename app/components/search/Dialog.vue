<script setup lang="ts">
import { Search } from '@lucide/vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value),
})

const searchPanelRef = useTemplateRef('searchPanel')
const query = ref('')
const activeIndex = ref(0)
const trimmedQuery = computed(() => query.value.trim())
const waitingForSearch = ref(false)
let scheduledSearchId = 0

const { results, loading, error, search, reset } = useArticleSearch()

const activeResult = computed(() => results.value[activeIndex.value] ?? results.value[0] ?? null)

function focusInput() {
  nextTick(() => {
    requestAnimationFrame(() => {
      searchPanelRef.value?.querySelector('input')?.focus()
    })
  })
}

watch(trimmedQuery, (nextQuery, _, onCleanup) => {
  scheduledSearchId += 1
  const currentSearchId = scheduledSearchId
  activeIndex.value = 0

  if (!nextQuery) {
    waitingForSearch.value = false
    reset()
    return
  }

  waitingForSearch.value = true
  reset()

  const timeout = setTimeout(() => {
    search(nextQuery)
      .finally(() => {
        if (currentSearchId === scheduledSearchId) {
          waitingForSearch.value = false
        }
      })
  }, 180)

  onCleanup(() => clearTimeout(timeout))
})

watch(() => results.value.length, (length) => {
  if (!length) {
    activeIndex.value = 0
    return
  }

  if (activeIndex.value >= length) {
    activeIndex.value = 0
  }
})

watch(dialogVisible, (isVisible) => {
  if (isVisible) {
    focusInput()
    return
  }

  waitingForSearch.value = false
  query.value = ''
  activeIndex.value = 0
  reset()
})

function clickActiveResult() {
  const resultLinks = searchPanelRef.value?.querySelectorAll<HTMLElement>('[data-search-result="true"]')
  const activeLink = resultLinks?.[activeIndex.value]
  if (activeLink) {
    activeLink.click()
  }
}

async function handleInputKeydown(event: KeyboardEvent) {
  if (event.isComposing) {
    return
  }

  if (event.key === 'ArrowDown' && results.value.length > 0) {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % results.value.length
    return
  }

  if (event.key === 'ArrowUp' && results.value.length > 0) {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
    return
  }

  if (event.key === 'Enter' && activeResult.value) {
    event.preventDefault()
    clickActiveResult()
  }
}
</script>

<template>
  <HanaDialog v-model="dialogVisible" title="搜索文章" width="680px">
    <div ref="searchPanel" class="flex flex-col gap-4">
      <div class="sr-only">
        输入标题、标签、分类或正文片段进行搜索
      </div>
      <HanaInput
        v-model="query"
        name="article-search"
        shape="rounded"
        :prefix-icon="Search"
        placeholder="请输入文本"
        @keydown="handleInputKeydown"
      />

      <div v-if="!trimmedQuery" class="border border-primary/55 rounded-2xl border-dashed bg-primary/20 px-4 py-6 text-sm/6 text-text dark:border-hana-black-200/70 dark:bg-hana-black-800 dark:text-hana-white-700">
        输入标题、标签、分类或正文里的片段
      </div>

      <div v-else-if="waitingForSearch || loading" class="border border-primary/45 rounded-2xl bg-primary/20 px-4 py-6 text-sm text-text dark:border-hana-black-200/70 dark:bg-hana-black-800 dark:text-hana-white-700">
        搜索中...
      </div>

      <div v-else-if="error" class="border border-error-2/35 rounded-2xl bg-error-2/10 px-4 py-6 text-sm text-error-2 dark:border-error-2/40">
        {{ error }}
      </div>

      <div v-else-if="results.length === 0" class="border border-primary/55 rounded-2xl border-dashed bg-primary/20 px-4 py-6 text-sm/6 text-text dark:border-hana-black-200/70 dark:bg-hana-black-800 dark:text-hana-white-700">
        暂无文章
      </div>

      <div v-else class="flex flex-col gap-2 pb-1">
        <SearchResultItem
          v-for="(item, index) in results"
          :key="item.to"
          :item="item"
          :query="trimmedQuery"
          :active="index === activeIndex"
        />
      </div>
    </div>
  </HanaDialog>
</template>
