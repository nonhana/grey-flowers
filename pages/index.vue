<script setup lang="ts">
import { articleList } from '~/test/data'

const { t, locale } = useI18n()

useHead({
  title: t('head.name'),
  htmlAttrs: {
    lang: locale.value,
  },
  meta: [
    {
      name: 'description',
      content: t('head.description'),
    },
    {
      name: 'keywords',
      content: t('head.keywords'),
    },
  ],
})
</script>

<template>
  <div>
    <HanaInfoCard title="最近文章" icon="lucide:newspaper" to="/articles">
      <div
        class=" grid
        grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        <HanaArticleCard v-for="card in articleList" :key="card.id" v-bind="card" />
      </div>
    </HanaInfoCard>
  </div>
</template>
