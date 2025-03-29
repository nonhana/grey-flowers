<script setup lang="ts">
import type { Toc } from '@nuxt/content'

const props = defineProps<{ toc: Toc }>()
const visible = defineModel<boolean>()

const links = props.toc.links || []

const route = useRoute()
const { hash, path } = toRefs(route)

const activatedId = ref<string | null>(null)

onMounted(() => {
  activatedId.value = hash.value.slice(1)
})

watch(hash, (newHash) => {
  activatedId.value = newHash.slice(1)
})

const { data: neighbors } = await useAsyncData(
  `article-${path.value}-prev-next`,
  () => queryCollectionItemSurroundings(
    'content',
    route.path,
    { fields: ['title', 'path'] },
  )
    .where('title', '<>', 'About')
    .where('title', '<>', 'Friends')
    .order('publishedAt', 'DESC'),
)

const [prev, next] = neighbors.value || []
</script>

<template>
  <HanaDrawer v-model="visible" show-info title="文章目录" icon="lucide:table-of-contents">
    <template #default="{ close }">
      <div v-if="activatedId !== null" class="mx-auto flex w-4/5 flex-col gap-1 overflow-auto text-text dark:text-hana-white-700">
        <div @click="close">
          <ArticleTocItem v-for="link in links" :key="link.id" :link="link" :activated-id="activatedId" />
        </div>
      </div>
      <div v-else class="text-center text-xl">
        <Icon name="svg-spinners:8-dots-rotate" />
      </div>
    </template>
    <template #footer="{ close }">
      <NuxtLink
        v-if="prev"
        :to="prev.path"
        :aria-label="prev.title"
        :title="prev.title"
        class="hana-button w-full justify-start gap-5 text-text dark:text-hana-white-700"
        @click="close"
      >
        <span class="shrink-0">上一篇</span>
        <Icon name="lucide:arrow-left" class="shrink-0 animate-bounce-x" />
        <span class="line-clamp-1">{{ prev.title }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="next"
        :to="next.path"
        class="hana-button w-full justify-start gap-5 text-text dark:text-hana-white-700"
        @click="close"
      >
        <span class="shrink-0">下一篇</span>
        <Icon name="lucide:arrow-right" class="shrink-0 animate-bounce-x" />
        <span class="line-clamp-1">{{ next.title }}</span>
      </NuxtLink>
    </template>
  </HanaDrawer>
</template>
