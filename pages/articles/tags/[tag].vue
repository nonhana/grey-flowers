<script setup lang="ts">
import type { ArticleCardProps } from '~/types/article'

const route = useRoute()
const router = useRouter()

const page = ref(Number(route.query.page) || 1)
const pageSize = ref(6)

const { data: total } = await useAsyncData('total-articles', () => queryContent('articles')
  .where({ tags: { $in: [route.params.tag as string] } })
  .count())
const { data: articleData } = await useAsyncData('articles-by-page', () => queryContent('articles')
  .where({ tags: { $in: [route.params.tag as string] } })
  .skip((page.value - 1) * pageSize.value)
  .limit(pageSize.value)
  .without('body')
  .sort({ publishedAt: -1 })
  .find(), { watch: [page] })

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
      <div class="flex flex-col gap-5">
        <HanaArticleCard v-for="card in articleCards" :key="card.title" type="detail" v-bind="card" />
      </div>
    </div>
    <div class="sticky bottom-5 mx-auto mt-5 w-fit">
      <HanaPaginator v-model="page" :total="total ?? 0" />
    </div>
  </div>
</template>
