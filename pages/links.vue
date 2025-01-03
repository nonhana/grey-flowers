<script setup lang="ts">
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
</script>

<template>
  <div class="flex flex-col gap-8">
    <HanaInfoCard title="友情链接" icon="lucide:book-heart">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <LinksCard v-for="(friend, index) in friends" :key="friend.url" v-bind="{ ...friend, index }" />
      </div>
    </HanaInfoCard>
    <HanaInfoCard title="自己写的一些作品" icon="lucide:link">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <LinksCard v-for="(work, index) in works" :key="work.url" v-bind="{ ...work, index }" />
      </div>
    </HanaInfoCard>
    <HanaInfoCard title="来做朋友吧" icon="lucide:sticker">
      <ContentDoc path="/friends" class="flex flex-col gap-4 leading-7 dark:text-hana-white" />
    </HanaInfoCard>
    <Comment />
  </div>
</template>
