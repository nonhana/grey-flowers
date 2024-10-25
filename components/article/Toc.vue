<script setup lang="ts">
import type { ParsedContent } from '@nuxt/content'

const props = withDefaults(defineProps<{
  article: ParsedContent
}>(), {})

const links = props.article.body?.toc?.links || []

const route = useRoute()
const { hash } = toRefs(route)

const activatedId = ref<string | null>(null)

onMounted(() => {
  activatedId.value = hash.value.slice(1)
})

watch(hash, (newHash) => {
  activatedId.value = newHash.slice(1)
})
</script>

<template>
  <div class="hana-card sticky top-28 h-fit w-52 shrink-0 justify-self-end">
    <div class="flex items-center gap-2 text-xl">
      <Icon name="lucide:list" />
      <span class="with_underline">文章目录</span>
    </div>
    <hr class="my-2">
    <div v-if="activatedId !== null">
      <NuxtLink
        v-for="link in links" :key="link.id"
        :to="`#${link.id}`"
        class="hana-button"
        :class="{ 'hana-button--active': activatedId === link.id }"
      >
        <span class="line-clamp-2">
          {{ link.text }}
        </span>
      </NuxtLink>
    </div>
    <div v-else class="text-center text-xl">
      <Icon name="svg-spinners:8-dots-rotate" />
    </div>
  </div>
</template>
