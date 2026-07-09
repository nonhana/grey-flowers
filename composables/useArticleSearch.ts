import type { ArticleSearchItem } from '~/types/article'

export function useArticleSearch() {
  const results = ref<ArticleSearchItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let activeRequestId = 0

  function reset() {
    activeRequestId += 1
    results.value = []
    loading.value = false
    error.value = null
  }

  async function search(query: string) {
    const requestId = ++activeRequestId
    if (!query) {
      reset()
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/articles/search', {
        query: { q: query },
      })

      if (requestId !== activeRequestId) {
        return
      }

      if (!response.success) {
        results.value = []
        error.value = response.statusMessage || '搜索失败，请稍后重试。'
        return
      }

      results.value = Array.isArray(response.payload)
        ? response.payload as ArticleSearchItem[]
        : []
    }
    catch (fetchError) {
      console.error('[ArticleSearch] search error:', fetchError)

      if (requestId !== activeRequestId) {
        return
      }

      results.value = []
      error.value = '搜索失败，请稍后重试。'
    }
    finally {
      if (requestId === activeRequestId) {
        loading.value = false
      }
    }
  }

  return {
    results: shallowReadonly(results),
    loading: shallowReadonly(loading),
    error: shallowReadonly(error),
    search,
    reset,
  }
}
