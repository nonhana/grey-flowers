import type { ContentCollectionItem, ContentNavigationItem } from '@nuxt/content'

export const useArticleStore = defineStore('article', () => {
  const headerVisible = ref(false)
  const setHeaderVisible = (status: boolean) => {
    headerVisible.value = status
  }

  const content = ref<ContentCollectionItem | null>(null)
  const setContent = (v: ContentCollectionItem) => {
    content.value = v
  }

  const neighbors = ref<ContentNavigationItem[]>([])
  const setNeighbors = (v: ContentNavigationItem[]) => {
    neighbors.value = v
  }

  return {
    headerVisible,
    setHeaderVisible,
    content,
    setContent,
    neighbors,
    setNeighbors,
  }
})
