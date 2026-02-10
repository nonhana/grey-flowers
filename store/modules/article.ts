import type { ContentCollectionItem, ContentNavigationItem } from '@nuxt/content'

export type NeighborItem = ContentNavigationItem | null
export type Neighbors = [NeighborItem, NeighborItem]

export const useArticleStore = defineStore('article', () => {
  const headerVisible = ref(false)
  const setHeaderVisible = (status: boolean) => {
    headerVisible.value = status
  }

  const content = ref<ContentCollectionItem | null>(null)
  const setContent = (v: ContentCollectionItem) => {
    content.value = v
  }

  const neighbors = ref<Neighbors>([null, null])
  const setNeighbors = (v: Neighbors) => {
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
