<script setup lang="ts">
definePageMeta({
  name: 'tags',
})

const { data } = await useAsyncData('article-tags', () => $fetch('/api/tags/list'))

const tags = computed(() => data.value || [])
</script>

<template>
  <div>
    <header class="mb-5">
      <div class="text-xl text-hana-blue">
        <span class="text-xl">目前共计 <span class="font-bold">{{ tags.length }}</span> 个标签，仍在不断累积！</span>
      </div>
    </header>
    <div class="w-full rounded-md bg-white p-5 shadow-md">
      <div class="m-8 flex flex-wrap items-center justify-center gap-8">
        <HanaTooltip v-for="tag in tags" :key="tag.name" :content="`有${tag.count}篇文章`">
          <ArticleTag :name="tag.name" :count="tag.count" />
        </HanaTooltip>
      </div>
    </div>
  </div>
</template>
