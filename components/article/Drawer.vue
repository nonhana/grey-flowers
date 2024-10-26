<script setup lang="ts">
import type { ParsedContent } from '@nuxt/content'

const props = defineProps<{ article: ParsedContent }>()
const visible = defineModel<boolean>()

const links = props.article.body?.toc?.links || []

const route = useRoute()
const { hash, path } = toRefs(route)

const activatedId = ref<string | null>(null)

onMounted(() => {
  activatedId.value = hash.value.slice(1)
})

watch(hash, (newHash) => {
  activatedId.value = newHash.slice(1)
})

const { data: neighbors } = await useAsyncData(`article-${path.value}-prev-next`, () => queryContent()
  .only(['title', '_path'])
  .sort({ _id: -1 })
  .findSurround(path.value))

const [prev, next] = neighbors.value || []
</script>

<template>
  <HanaDrawer v-model="visible">
    <div class="flex flex-col gap-5">
      <div class="mt-5 flex shrink-0 flex-col items-center justify-items-end gap-2">
        <NuxtImg class="rounded-full" src="/images/avatar.webp" alt="non_hana" width="96" height="96" />
        <h2 class="text-xl text-hana-blue with_underline">
          non_hana
        </h2>
        <p class="text-sm">
          不要为每一件事都赋予意义。
        </p>
      </div>
      <hr>
      <div v-if="activatedId !== null" class="mx-auto flex w-4/5 flex-col gap-2 overflow-auto text-text">
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
    <template #footer>
      <hr class="mb-5">
      <NuxtLink
        v-if="prev"
        :to="prev._path"
        class="hana-button w-full justify-center gap-5 text-text"
      >
        <span class="line-clamp-1">{{ prev.title }}</span>
        <Icon name="lucide:arrow-left" class="shrink-0 animate-bounce-x" />
        <span class="shrink-0">上一篇</span>
      </NuxtLink>
      <NuxtLink
        v-if="next"
        :to="next._path"
        class="hana-button w-full justify-center gap-5 text-text"
      >
        <span class="shrink-0">下一篇</span>
        <Icon name="lucide:arrow-right" class="shrink-0 animate-bounce-x" />
        <span class="line-clamp-1">{{ next.title }}</span>
      </NuxtLink>
    </template>
  </HanaDrawer>
</template>
