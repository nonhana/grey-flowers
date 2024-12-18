<script setup lang="ts">
import type { ArticleHeader } from '~/types/content'
import dayjs from 'dayjs'
import { navbarData, seoData } from '~/data/meta'
import { useStore } from '~/store'

definePageMeta({
  name: 'article-detail',
})

const { path } = useRoute()

const { data: article } = await useAsyncData(`article-${path}`, () => queryContent(path).findOne())

const articleHeader = computed<ArticleHeader>(() => ({
  title: article.value?.title || '暂无标题',
  description: article.value?.description || '暂无简介~',
  cover: article.value?.cover || '/images/not-found.webp',
  alt: article.value?.alt || '暂无图片',
  ogImage: article.value?.ogImage || '/images/not-found.webp',
  tags: article.value?.tags || [],
  category: article.value?.category || '未分类',
  publishedAt: dayjs(article.value?.publishedAt).format('YYYY-MM-DD'),
  editedAt: dayjs(article.value?.editedAt).format('YYYY-MM-DD'),
  published: article.value?.published || false,
  wordCount: article.value?.wordCount || 0,
}))

const drawerVisible = ref(false)

function handleClick() {
  drawerVisible.value = !drawerVisible.value
}

const { articleHeadStatusStore } = useStore()
const { visible } = toRefs(articleHeadStatusStore)

useHead({
  title: articleHeader.value.title,
  link: [
    {
      rel: 'canonical',
      href: `${seoData.mySite}/${path}`,
    },
  ],
})

useSeoMeta({
  title: articleHeader.value.title,
  description: articleHeader.value.description,
  ogTitle: articleHeader.value.title,
  ogDescription: articleHeader.value.description,
  ogImage: `${seoData.mySite}/_ipx/q_85${articleHeader.value.ogImage}`,
  ogSiteName: navbarData.homeTitle,
  ogType: 'website',
  ogUrl: `${seoData.mySite}/${path}`,
  twitterSite: '@non_hanaz',
  twitterCard: 'summary_large_image',
  twitterTitle: articleHeader.value.title,
  twitterDescription: articleHeader.value.description,
  twitterImage: articleHeader.value.ogImage,
})
</script>

<template>
  <div class="min-h-screen w-full">
    <div class="flex gap-8">
      <div class="w-full xl:max-w-[calc(100%-272px)]">
        <ArticleHeader v-if="article" v-bind="articleHeader" />
        <div class="max-w-none leading-7">
          <ContentRenderer v-if="article" :value="article" class="flex flex-col gap-4">
            <template #empty>
              <p>No content found.</p>
            </template>
          </ContentRenderer>
        </div>
        <div class="mt-5">
          <Comment />
        </div>
      </div>
      <div class="hidden max-w-fit xl:block">
        <div class="fixed flex flex-col gap-5 transition-all" :class="{ '-mt-20': !visible }">
          <ArticleAuthor />
          <ArticleSwitch />
          <ArticleToc v-if="article" :article="article" />
        </div>
      </div>
    </div>
    <div class="fixed bottom-5 right-5 z-10 block xl:hidden">
      <div class="hana-card">
        <div class="hana-button w-full gap-2 text-center" @click="handleClick">
          <Icon name="lucide:menu" />
        </div>
      </div>
    </div>
    <div class="block xl:hidden">
      <ArticleDrawer v-if="article" v-model="drawerVisible" :article="article" />
    </div>
  </div>
</template>
