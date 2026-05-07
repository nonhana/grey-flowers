<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { ArticleCardProps } from '~/types/article'

const props = withDefaults(
  defineProps<ArticleCardProps & { index: number }>(),
  { variant: 'compact' },
)

const opacity = shallowRef(0)
const top = shallowRef('10px')

const isFeatured = computed(() => props.variant === 'featured')
const isCompact = computed(() => props.variant === 'compact')

const maxVisibleTags = computed(() => isFeatured.value ? 3 : isCompact.value ? 2 : 3)

const visibleTags = computed(() => props.tags.slice(0, maxVisibleTags.value))
const hiddenTagCount = computed(() => Math.max(0, props.tags.length - visibleTags.value.length))
const hiddenTagLabel = computed(() => `+${hiddenTagCount.value}`)
const normalizedDescription = computed(() => props.description.trim() || '暂无简介')
const coverAlt = computed(() => `${props.title} 封面`)
const transitionStyle = computed<StyleValue>(() => ({
  transition: `opacity 0.35s ease-out ${props.index * 0.08}s, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${props.index * 0.08}s`,
  opacity: opacity.value,
  transform: `translateY(${top.value})`,
}))

onMounted(() => {
  floatAnimation(opacity, top)
})
</script>

<template>
  <div :style="transitionStyle" class="h-full">
    <NuxtLink
      :to="to"
      :aria-label="title"
      :title="title"
      class="group relative block h-full w-full overflow-hidden border border-primary/55 rounded-[24px] bg-white text-left text-hana-black shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out active:scale-[0.99] dark:border-hana-black-200/80 hover:border-hana-blue/35 dark:bg-hana-black dark:text-hana-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-hana-blue/45 focus-visible:ring-offset-primary-100 hover:-translate-y-0.5 dark:hover:border-hana-blue-300/40 dark:focus-visible:ring-hana-blue-300/45 dark:focus-visible:ring-offset-hana-black-900"
    >
      <!-- Featured: 与 compact 同体量的横向卡片，仅靠占位宽度 + 略大标题作为差异 -->
      <div v-if="isFeatured" class="h-full flex flex-col gap-4 p-4 md:flex-row md:gap-5">
        <div class="order-1 shrink-0 overflow-hidden border border-primary/45 rounded-[18px] bg-primary-100/65 md:order-2 md:w-[11rem] md:self-center dark:border-hana-black-200/70 dark:bg-hana-black-700/70">
          <NuxtImg
            :src="cover"
            :alt="coverAlt"
            class="aspect-[16/9] size-full transition-transform duration-500 ease-out object-cover md:aspect-[4/3] group-hover:scale-103"
          />
        </div>

        <div class="order-2 min-w-0 flex flex-1 flex-col gap-3 md:order-1">
          <div class="min-h-7 flex flex-wrap items-start gap-2">
            <ArticleTag v-for="tag in visibleTags" :key="tag" :name="tag" size="small" variant="card" />
            <ArticleTag v-if="hiddenTagCount" :name="hiddenTagLabel" size="small" variant="card" />
          </div>

          <div class="space-y-2">
            <h2 class="text-[1.35rem] font-bold leading-[1.22] line-clamp-2 dark:text-hana-white">
              {{ title }}
            </h2>
            <p class="text-[0.95rem] text-text-3 leading-6 line-clamp-2 dark:text-hana-white-700">
              {{ normalizedDescription }}
            </p>
          </div>

          <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-primary/45 pt-3 text-[11px] text-text tracking-[0.03em] font-code dark:border-hana-black-200/70 dark:text-hana-white-700">
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:calendar" size="12" />
              <time :datetime="publishedAt">{{ publishedAt }}</time>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:file-text" size="12" />
              <span>{{ wordCount }}字</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Compact: 固定 8.5rem 正方形图片，flex 横向布局，所有断点统一 -->
      <div v-else-if="isCompact" class="h-full flex gap-4 p-4">
        <div class="min-w-0 flex flex-1 flex-col gap-2.5">
          <div class="min-h-6 flex flex-wrap items-start gap-1.5">
            <ArticleTag v-for="tag in visibleTags" :key="tag" :name="tag" size="small" variant="card" />
            <ArticleTag v-if="hiddenTagCount" :name="hiddenTagLabel" size="small" variant="card" />
          </div>

          <div class="space-y-2">
            <h2 class="text-[1.05rem] font-bold leading-[1.28] line-clamp-2 dark:text-hana-white">
              {{ title }}
            </h2>
            <p class="text-sm text-text leading-6 line-clamp-2 dark:text-hana-white-700">
              {{ normalizedDescription }}
            </p>
          </div>

          <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text font-code dark:text-hana-white-700">
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:calendar" size="12" />
              <time :datetime="publishedAt">{{ publishedAt }}</time>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:file-text" size="12" />
              <span>{{ wordCount }}字</span>
            </span>
          </div>
        </div>

        <div class="size-[8.5rem] shrink-0 self-center overflow-hidden border border-primary/45 rounded-[18px] bg-primary-100/70 dark:border-hana-black-200/70 dark:bg-hana-black-700/70">
          <NuxtImg
            :src="cover"
            :alt="coverAlt"
            class="size-full transition-transform duration-500 ease-out object-cover group-hover:scale-103"
          />
        </div>
      </div>

      <!-- Row: 14rem 图片 + 16/9 比例锁定卡片高度，移除强制换行的 max-w 限制 -->
      <div v-else class="h-full flex flex-col gap-4 p-4 md:flex-row md:gap-5">
        <div class="order-1 shrink-0 overflow-hidden border border-primary/45 rounded-[18px] bg-primary-100/65 md:order-2 md:w-[14rem] md:self-center dark:border-hana-black-200/70 dark:bg-hana-black-700/70">
          <NuxtImg
            :src="cover"
            :alt="coverAlt"
            class="aspect-[16/9] size-full transition-transform duration-500 ease-out object-cover group-hover:scale-103"
          />
        </div>

        <div class="order-2 min-w-0 flex flex-1 flex-col gap-3 md:order-1">
          <div class="min-h-7 flex flex-wrap items-start gap-2">
            <ArticleTag v-for="tag in visibleTags" :key="tag" :name="tag" size="small" variant="card" />
            <ArticleTag v-if="hiddenTagCount" :name="hiddenTagLabel" size="small" variant="card" />
          </div>

          <div class="space-y-2">
            <h2 class="text-[1.25rem] font-bold leading-[1.22] line-clamp-2 dark:text-hana-white">
              {{ title }}
            </h2>
            <p class="text-[0.95rem] text-text-3 leading-6 line-clamp-2 dark:text-hana-white-700">
              {{ normalizedDescription }}
            </p>
          </div>

          <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-primary/45 pt-3 text-[11px] text-text tracking-[0.03em] font-code dark:border-hana-black-200/70 dark:text-hana-white-700">
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:calendar" size="12" />
              <time :datetime="publishedAt">{{ publishedAt }}</time>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <Icon name="lucide:file-text" size="12" />
              <span>{{ wordCount }}字</span>
            </span>
          </div>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
