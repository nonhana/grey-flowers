<script setup lang="ts">
import type { TocLink } from '@nuxt/content'

const props = defineProps<{
  link: TocLink
  activatedId: string
}>()

const isActive = computed(() => props.activatedId === props.link.id)
</script>

<template>
  <div class="flex flex-col gap-1">
    <NuxtLink
      :to="`#${link.id}`"
      class="hana-button"
      :class="{ 'hana-button--active': isActive }"
    >
      <span class="line-clamp-2">{{ link.text }}</span>
    </NuxtLink>
    <div class="flex flex-col gap-1 pl-4">
      <ArticleTocItem
        v-for="child in link.children"
        :key="child.id"
        :link="child"
        :activated-id="activatedId"
      />
    </div>
  </div>
</template>
