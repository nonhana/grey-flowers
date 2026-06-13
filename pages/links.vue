<script setup lang="ts">
import type { MarkdownPagePayload } from '~/types/markdown'
import { BookHeart, Link as LinkIcon, Sticker } from '@lucide/vue'
import { linksPageData } from '~/data/meta'
import friends from '~/json/friends.json'
import works from '~/json/works.json'

useHead({
  title: linksPageData.title,
  meta: [
    {
      name: 'description',
      content: linksPageData.description,
    },
  ],
})

const { data: articleResponse } = await useFetch('/api/markdown/friends', {
  key: 'friends-article',
})

const article = computed<MarkdownPagePayload | null>(() =>
  (articleResponse.value?.payload as MarkdownPagePayload | null) ?? null,
)
</script>

<template>
  <div class="flex flex-col gap-8">
    <HanaInfoCard title="友情链接" :icon="BookHeart">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3 md:grid-cols-2">
        <LinksCard v-for="(friend, index) in friends" :key="friend.url" v-bind="{ ...friend, index }" />
      </div>
    </HanaInfoCard>
    <HanaInfoCard title="自己写的一些作品" :icon="LinkIcon">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3 md:grid-cols-2">
        <LinksCard v-for="(work, index) in works" :key="work.url" v-bind="{ ...work, index }" />
      </div>
    </HanaInfoCard>
    <HanaInfoCard title="来做朋友吧" :icon="Sticker">
      <MarkdownRenderer v-if="article" :value="article" class="flex flex-col gap-4 leading-7 dark:text-hana-white" />
    </HanaInfoCard>
    <Comment />
  </div>
</template>
