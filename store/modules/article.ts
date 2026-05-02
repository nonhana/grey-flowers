import type { ArticleMarkdownPayload, Neighbors } from '~/types/markdown'

export type { NeighborItem, Neighbors } from '~/types/markdown'

export const useArticleStore = defineStore('article', () => {
  const headerVisible = ref(false)
  const setHeaderVisible = (status: boolean) => {
    headerVisible.value = status
  }

  const content = ref<ArticleMarkdownPayload | null>(null)
  const setContent = (v: ArticleMarkdownPayload) => {
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
