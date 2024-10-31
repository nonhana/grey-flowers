<script setup lang="ts">
const { data } = await useAsyncData('article-tags', () => queryContent('articles').only(['tags']).find())

const tags = computed(() => {
  if (!data.value)
    return []
  const tagMap = new Map<string, number>()
  data.value.forEach((article) => {
    article.tags.forEach((tag: string) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })
  })
  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
})
</script>

<template>
  <div class="w-full rounded-md bg-white p-5 shadow-md">
    <span class="text-xl">目前共计 {{ data?.length || 0 }} 个标签</span>
    <div class="m-8 flex flex-wrap items-center justify-center gap-8">
      <HanaTooltip v-for="tag in tags" :key="tag.name" :content="`有${tag.count}篇文章`">
        <ArticleTag :name="tag.name" :count="tag.count" />
      </HanaTooltip>
    </div>
  </div>
</template>
