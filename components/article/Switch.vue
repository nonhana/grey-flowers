<script setup lang="ts">
const route = useRoute()

const { data: neighbors } = await useAsyncData(
  `article-${route.path}-prev-next`,
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
  <div class="hana-card h-fit w-60 shrink-0 justify-self-end">
    <HanaTooltip v-if="prev" position="left" :content="prev.title" animation="slide">
      <NuxtLink
        :to="prev.path"
        :aria-label="prev.title"
        class="hana-button w-full justify-center gap-10"
      >
        <span>上一篇</span>
        <Icon name="lucide:arrow-left" class="animate-bounce-x" />
      </NuxtLink>
    </HanaTooltip>
    <HanaTooltip v-if="next" position="left" :content="next.title" animation="slide">
      <NuxtLink
        :to="next.path"
        :aria-label="next.title"
        class="hana-button w-full justify-center gap-10"
      >
        <span>下一篇</span>
        <Icon name="lucide:arrow-right" class="animate-bounce-x" />
      </NuxtLink>
    </HanaTooltip>
  </div>
</template>
