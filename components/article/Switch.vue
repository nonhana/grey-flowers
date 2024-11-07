<script setup lang="ts">
const { path } = useRoute()

const { data: neighbors } = await useAsyncData(`article-${path}-prev-next`, () => queryContent()
  .only(['title', '_path'])
  .sort({ publishedAt: -1 })
  .findSurround(path))

const [prev, next] = neighbors.value || []
</script>

<template>
  <div class="hana-card h-fit w-60 shrink-0 justify-self-end">
    <HanaTooltip v-if="prev" position="left" :content="prev.title">
      <NuxtLink
        :to="prev._path"
        class="hana-button w-full justify-center gap-10"
      >
        <span>上一篇</span>
        <Icon name="lucide:arrow-left" class="animate-bounce-x" />
      </NuxtLink>
    </HanaTooltip>
    <HanaTooltip v-if="next" position="left" :content="next.title">
      <NuxtLink
        :to="next._path"
        class="hana-button w-full justify-center gap-10"
      >
        <span>下一篇</span>
        <Icon name="lucide:arrow-right" class="animate-bounce-x" />
      </NuxtLink>
    </HanaTooltip>
  </div>
</template>
