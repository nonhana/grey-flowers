<script setup lang="ts">
import type { ArticleHeader } from '~/types/content'

definePageMeta({
  name: 'article-detail',
})

const { path } = useRoute()

const { data: article, error } = await useAsyncData(`article-${path}`, () => queryContent(path).findOne())

if (error.value) {
  navigateTo('/404')
}

const articleHeader = computed<ArticleHeader>(() => ({
  title: article.value?.title || '暂无标题',
  description: article.value?.description || '暂无简介~',
  cover: article.value?.cover || '/images/not-found.webp',
  alt: article.value?.alt || '暂无图片',
  ogImage: article.value?.ogImage || '/images/not-found.webp',
  tags: article.value?.tags || [],
  category: article.value?.category || '未分类',
  publishedAt: article.value?.publishedAt || '',
  editedAt: article.value?.editedAt || '',
  published: article.value?.published || false,
  wordCount: article.value?.wordCount || 0,
}))

defineOgImageComponent('og-image', {
  title: articleHeader.value.title,
  description: articleHeader.value.description,
  link: articleHeader.value.ogImage,
})

const drawerVisible = ref(false)
function handleClick() {
  drawerVisible.value = !drawerVisible.value
}
</script>

<template>
  <div class="min-h-screen w-full">
    <div class="flex gap-8">
      <div class="w-full">
        <ArticleHeader v-if="article" v-bind="articleHeader" />
        <div class="prose w-full max-w-none">
          <ContentRenderer v-if="article" :value="article">
            <template #empty>
              <p>No content found.</p>
            </template>
          </ContentRenderer>
        </div>
      </div>
      <div class="hidden lg:block">
        <div class="sticky top-20 flex flex-col gap-5">
          <ArticleAuthor />
          <ArticleSwitch />
          <ArticleToc v-if="article" :article="article" />
        </div>
      </div>
    </div>
    <div class="fixed bottom-5 right-5 block lg:hidden">
      <div class="hana-card">
        <div class="hana-button w-full gap-2 text-center" @click="handleClick">
          <span>文章目录</span>
          <Icon name="lucide:menu" />
        </div>
      </div>
    </div>
    <div class="block lg:hidden">
      <ArticleDrawer v-if="article" v-model="drawerVisible" :article="article" />
    </div>
  </div>
</template>
