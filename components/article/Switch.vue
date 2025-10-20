<script setup lang="ts">
const props = defineProps<{ prev?: { title: string; path: string }; next?: { title: string; path: string } }>()
const { prev, next } = toRefs(props)
</script>

<template>
  <div class="h-fit w-60 shrink-0 justify-self-end hana-card">
    <HanaTooltip v-if="prev" position="left" :content="prev.title" animation="slide">
      <NuxtLink
        :to="prev.path"
        :aria-label="prev.title"
        class="w-full hana-button justify-center gap-10"
      >
        <span>上一篇</span>
        <Icon name="lucide:arrow-left" class="animate-bounce-x" />
      </NuxtLink>
    </HanaTooltip>
    <HanaTooltip v-if="next" position="left" :content="next.title" animation="slide">
      <NuxtLink
        :to="next.path"
        :aria-label="next.title"
        class="w-full hana-button justify-center gap-10"
      >
        <span>下一篇</span>
        <Icon name="lucide:arrow-right" class="animate-bounce-x" />
      </NuxtLink>
    </HanaTooltip>
  </div>
</template>
