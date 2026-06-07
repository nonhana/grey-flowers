<script setup lang="ts">
import type { Toc } from '@nuxtjs/mdc'
import type { MarkdownNavigationItem } from '~/types/markdown'

const props = defineProps<{
  toc: Toc
  prev?: MarkdownNavigationItem | null
  next?: MarkdownNavigationItem | null
}>()

const drawerRef = useTemplateRef('drawerRef')

const visible = defineModel<boolean>()

const links = computed(() => props.toc.links || [])

const route = useRoute()

const activatedId = ref<string | null>(null)

onMounted(() => {
  activatedId.value = route.hash.slice(1)
})

watch(() => route.hash, (newHash) => {
  activatedId.value = newHash.slice(1)
})

watch(() => route.fullPath, () => {
  if (visible.value) {
    drawerRef.value?.closeDrawer()
  }
})

const { prev, next } = toRefs(props)
</script>

<template>
  <HanaDrawer ref="drawerRef" v-model="visible" show-info title="文章目录" icon="lucide:table-of-contents">
    <div v-if="links.length > 0 && activatedId !== null" class="mx-auto w-4/5 flex flex-col gap-1 overflow-auto text-text dark:text-hana-white-700">
      <ArticleTocItem v-for="link in links" :key="link.id" :link="link" :activated-id="activatedId" />
    </div>
    <div v-else-if="links.length === 0" class="flex flex-col items-center gap-2 py-4 text-text dark:text-hana-white-700">
      <Icon name="lucide:file-text" size="32" />
      <span>暂无目录</span>
    </div>
    <div v-else class="flex flex-col items-center gap-2 py-4 text-text dark:text-hana-white-700">
      <Icon name="lucide:loader-circle" size="32" class="animate-spin" />
      <span>加载中...</span>
    </div>
    <template #footer>
      <NuxtLink
        v-if="prev"
        :to="prev.path"
        :aria-label="prev.title"
        :title="prev.title"
        class="w-full hana-button justify-start gap-5 text-text dark:text-hana-white-700"
      >
        <span class="shrink-0">上一篇</span>
        <Icon name="lucide:arrow-left" class="shrink-0 animate-bounce-x" />
        <span class="line-clamp-1">{{ prev.title }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="next"
        :to="next.path"
        class="w-full hana-button justify-start gap-5 text-text dark:text-hana-white-700"
      >
        <span class="shrink-0">下一篇</span>
        <Icon name="lucide:arrow-right" class="shrink-0 animate-bounce-x" />
        <span class="line-clamp-1">{{ next.title }}</span>
      </NuxtLink>
    </template>
  </HanaDrawer>
</template>
