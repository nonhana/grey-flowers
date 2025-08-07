<script setup lang="ts">
import type { ArticleFilterQuery } from '~/server/types/articles'
import type { ArticleCardProps } from '~/types/article'

const props = withDefaults(defineProps<{
  type?: 'common' | 'tags' | 'category' | 'archives'
}>(), {
  type: 'common',
})
const route = useRoute()
const router = useRouter()

const { query } = toRefs(route)

function remainTwoDigits(num: string) {
  return num.length === 1 ? `0${num}` : num
}

const whereObj = computed(() => {
  const result: ArticleFilterQuery = {}
  switch (props.type) {
    case 'tags':
      result.tag = route.query.tag as string
      break
    case 'category':
      result.category = antiFlatStr(route.params.category as string)
      break
    case 'archives':
      result.publishedAtMonth = `${query.value.year}-${remainTwoDigits(String(query.value.month ?? '01'))}`
      break
  }
  return result
})

const displayCols = computed(() => {
  switch (props.type) {
    case 'archives':
      return 2
    default:
      return 1
  }
})

const page = ref(Number(route.query.page) || 1)
const pageSize = ref(6)

const articlesCountKey = computed(() => `articles-count-${props.type}`)

const { data: fetchedTotal } = await useAsyncData(
  articlesCountKey,
  () => $fetch('/api/articles/count', {
    query: whereObj.value,
  }),
  { watch: [whereObj] },
)
const total = computed(() => fetchedTotal.value ? fetchedTotal.value.payload ?? 0 : 0)

const fetchArticleQuery = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  ...whereObj.value,
}))

const articlesListKey = computed(() => {
  const queryStr = new URLSearchParams(fetchArticleQuery.value as Record<string, any>).toString()
  return `articles-list?type=${props.type}&${queryStr}`
})

const { data: fetchedArticleData } = await useAsyncData(
  articlesListKey,
  () => $fetch('/api/articles/list', {
    query: fetchArticleQuery.value,
  }),
  { watch: [fetchArticleQuery] },
)
const articleData = computed(() => fetchedArticleData.value ? fetchedArticleData.value.payload ?? [] : [])

const articleCards = computed<ArticleCardProps[]>(() =>
  articleData.value.map((article) => {
    return {
      to: article.to,
      title: article.title,
      description: article.description || '暂无简介~',
      cover: article.cover || '/images/not-found.webp',
      tags: article.tags,
      publishedAt: article.publishedAt,
      editedAt: article.editedAt,
      wordCount: article.wordCount,
    }
  }),
)

watch(page, async (newPage) => {
  router.replace({ query: { ...route.query, page: newPage.toString() } })
}, { immediate: true })

watch(() => route.query.page, (pageQuery) => {
  const newPage = Number(pageQuery) || 1
  if (newPage !== page.value) {
    page.value = newPage
  }
})
</script>

<template>
  <div class="size-full flex flex-col">
    <div class="flex-1">
      <div class="gap-5" :class="[type === 'archives' ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex flex-col']">
        <ArticleCard v-for="(card, index) in articleCards" :key="`${card.title}-${index}`" type="detail" v-bind="{ ...card, index, displayCols }" />
      </div>
    </div>
    <div class="sticky bottom-5 mx-auto mt-5 w-fit">
      <HanaPaginator v-model="page" :total="total" />
    </div>
  </div>
</template>
