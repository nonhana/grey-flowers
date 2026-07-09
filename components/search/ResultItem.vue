<script setup lang="ts">
import type { ArticleSearchItem } from '~/types/article'

interface HighlightSegment {
  text: string
  matched: boolean
}

const props = withDefaults(defineProps<{
  item: ArticleSearchItem
  query?: string
  active?: boolean
}>(), {
  query: '',
  active: false,
})

const visibleTags = computed(() => props.item.tags.slice(0, 3))
const summary = computed(() => props.item.snippet || props.item.description || '暂无摘要')
const highlightTerms = computed(() => {
  const query = props.query.trim()
  if (!query) {
    return []
  }

  return Array.from(new Set([query, ...query.split(/\s+/)]))
    .map(term => term.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
})

const highlightClass = 'box-decoration-clone rounded-[6px] bg-hana-blue-150/85 px-1 text-hana-blue dark:bg-hana-blue/20 dark:text-hana-blue-200'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitHighlightSegments(value: string): HighlightSegment[] {
  if (!value || highlightTerms.value.length === 0) {
    return [{ text: value, matched: false }]
  }

  const pattern = new RegExp(`(${highlightTerms.value.map(escapeRegex).join('|')})`, 'giu')
  const matchedTerms = new Set(highlightTerms.value.map(term => term.toLocaleLowerCase()))

  return value
    .split(pattern)
    .filter(Boolean)
    .map(text => ({
      text,
      matched: matchedTerms.has(text.toLocaleLowerCase()),
    }))
}

const titleSegments = computed(() => splitHighlightSegments(props.item.title))
const summarySegments = computed(() => splitHighlightSegments(summary.value))
const categorySegments = computed(() => splitHighlightSegments(props.item.category))
const visibleTagItems = computed(() =>
  visibleTags.value.map(tag => ({
    name: tag,
    segments: splitHighlightSegments(tag),
  })),
)
</script>

<template>
  <NuxtLink
    :to="item.to"
    data-search-result="true"
    class="w-full border rounded-2xl px-4 py-3 text-left transition-all"
    :class="[
      active
        ? 'border-hana-blue/45 bg-hana-blue-50/70 shadow-sm dark:border-hana-blue-300/45 dark:bg-hana-black-700'
        : 'border-primary/45 bg-white/90 hover:border-hana-blue/30 hover:bg-primary/30 dark:border-hana-black-200/60 dark:bg-hana-black-800 dark:hover:border-hana-blue-300/35 dark:hover:bg-hana-black-700',
    ]"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-base font-bold line-clamp-1 dark:text-hana-white">
        <template v-for="(segment, index) in titleSegments" :key="`${item.to}-title-${index}`">
          <span :class="segment.matched ? highlightClass : undefined">
            {{ segment.text }}
          </span>
        </template>
      </h3>
      <time class="shrink-0 text-[11px] text-text tracking-[0.04em] font-code dark:text-hana-white-700">
        {{ item.publishedAt }}
      </time>
    </div>

    <p class="mt-2 text-sm/6 text-text-3 line-clamp-2 dark:text-hana-white-700">
      <template v-for="(segment, index) in summarySegments" :key="`${item.to}-summary-${index}`">
        <span :class="segment.matched ? highlightClass : undefined">
          {{ segment.text }}
        </span>
      </template>
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class="text-[11px] text-text-3 tracking-[0.12em] font-code uppercase dark:text-hana-white-700/85">
        <template v-for="(segment, index) in categorySegments" :key="`${item.to}-category-${index}`">
          <span :class="segment.matched ? highlightClass : undefined">
            {{ segment.text }}
          </span>
        </template>
      </span>
      <span
        v-for="tag in visibleTagItems"
        :key="tag.name"
        class="inline-flex items-center justify-center whitespace-nowrap border border-primary/55 rounded-full bg-hana-white/80 px-2.5 py-1 text-[11px] text-text leading-none tracking-[0.03em] font-code uppercase dark:border-hana-black-200/80 dark:bg-hana-black-700/72 dark:text-hana-white-700"
      >
        <template v-for="(segment, index) in tag.segments" :key="`${tag.name}-${index}`">
          <span :class="segment.matched ? highlightClass : undefined">
            {{ segment.text }}
          </span>
        </template>
      </span>
    </div>
  </NuxtLink>
</template>
