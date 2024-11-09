<script setup lang="ts">
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
  switch (props.type) {
    case 'tags':
      return { tags: { $in: [route.params.tag as string] } }
    case 'category':
      return { category: antiFlatStr(route.params.category as string) }
    case 'archives':
      return { publishedAt: { $regex: `^${query.value.year}-${remainTwoDigits(query.value.month as string)}` } }
    default:
      return {}
  }
})

const page = ref(Number(route.query.page) || 1)
const pageSize = ref(6)

const { data: total } = await useAsyncData('total-articles-category', () => queryContent('articles')
  .where(whereObj.value)
  .count())
const { data: articleData } = await useAsyncData('articles-by-page', () => queryContent('articles')
  .where(whereObj.value)
  .skip((page.value - 1) * pageSize.value)
  .limit(pageSize.value)
  .without('body')
  .sort({ publishedAt: -1 })
  .find(), { watch: [query] })

watch(page, async (newPage) => {
  router.replace({ query: { ...route.query, page: newPage.toString() } })
}, { immediate: true })

watch(() => route.query.page, (pageQuery) => {
  const newPage = Number(pageQuery) || 1
  if (newPage !== page.value) {
    page.value = newPage
  }
})

const articleCards = computed<ArticleCardProps[]>(() =>
  articleData.value?.map((article) => {
    return {
      to: article._path || '/404',
      title: article.title || '暂无标题',
      description: article.description || '暂无简介~',
      cover: article.cover || '/images/not-found.webp',
      tags: article.tags || [],
      publishedAt: new Date(article.publishedAt || '').toLocaleDateString(),
      editedAt: new Date(article.editedAt || '').toLocaleDateString(),
      wordCount: article.wordCount || 0,
    }
  }) || [],
)
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="flex-1">
      <div class="gap-5" :class="[type === 'archives' ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex flex-col']">
        <HanaArticleCard v-for="card in articleCards" :key="card.title" type="detail" v-bind="card" />
      </div>
    </div>
    <div class="sticky bottom-5 mx-auto mt-5 w-fit">
      <HanaPaginator v-model="page" :total="total ?? 0" />
    </div>
  </div>
</template>
