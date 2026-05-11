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

const maxVisibleTags = computed(() => isFeatured.value ? 3 : isCompact.value ? 3 : 4)

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
      class="group relative block size-full overflow-hidden rounded-lg bg-white text-left text-hana-black shadow-md transition-transform duration-300 ease-out active:scale-[0.99] dark:bg-hana-black dark:text-hana-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-hana-blue/45 focus-visible:ring-offset-primary-100 hover:-translate-y-0.5 dark:focus-visible:ring-hana-blue-300/45 dark:focus-visible:ring-offset-hana-black-900"
    >
      <div v-if="isFeatured" class="h-full flex flex-col md:min-h-100 md:flex-row">
        <div class="order-1 h-56 w-full shrink-0 overflow-hidden border-b border-primary/35 md:order-2 md:h-auto md:w-112 md:border-b-0 md:border-l dark:border-hana-black-200/55">
          <NuxtImg
            :src="cover"
            :alt="coverAlt"
            class="size-full transition-transform duration-700 ease-out object-cover group-hover:scale-105"
          />
        </div>

        <div class="order-2 min-w-0 flex flex-1 flex-col gap-4 p-5 md:order-1 md:gap-5 md:p-7">
          <div class="min-h-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-3 font-medium tracking-[0.18em] font-code uppercase dark:text-hana-white-700/85">
            <template v-for="(tag, i) in visibleTags" :key="tag">
              <span>{{ tag }}</span>
              <span v-if="i < visibleTags.length - 1 || hiddenTagCount" class="opacity-50">·</span>
            </template>
            <span v-if="hiddenTagCount">{{ hiddenTagLabel }}</span>
          </div>

          <h2 class="text-2xl font-bold line-clamp-2 md:text-3xl dark:text-hana-white">
            {{ title }}
          </h2>

          <p class="text-base text-text-3 line-clamp-3 dark:text-hana-white-700">
            {{ normalizedDescription }}
          </p>

          <div class="mt-auto flex items-end justify-between border-t border-primary/35 pt-4 dark:border-hana-black-200/55">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text font-code dark:text-hana-white-700">
              <span class="inline-flex items-center gap-1.5">
                <Icon name="lucide:calendar" size="12" />
                <time :datetime="publishedAt">{{ publishedAt }}</time>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Icon name="lucide:file-text" size="12" />
                <span>{{ wordCount }}字</span>
              </span>
            </div>
            <Icon
              name="lucide:arrow-right"
              size="18"
              class="text-text-3 transition-transform duration-300 ease-out group-hover:translate-x-1 dark:text-hana-white-700"
            />
          </div>
        </div>
      </div>

      <div v-else-if="isCompact" class="h-full flex flex-col">
        <div class="h-60 w-full overflow-hidden border-b border-primary/35 dark:border-hana-black-200/55">
          <NuxtImg
            :src="cover"
            :alt="coverAlt"
            class="size-full transition-transform duration-700 ease-out object-cover group-hover:scale-105"
          />
        </div>

        <div class="min-w-0 flex flex-1 flex-col gap-3.5 p-5">
          <div class="min-h-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-3 font-medium tracking-[0.18em] font-code uppercase dark:text-hana-white-700/85">
            <template v-for="(tag, i) in visibleTags" :key="tag">
              <span>{{ tag }}</span>
              <span v-if="i < visibleTags.length - 1 || hiddenTagCount" class="opacity-50">·</span>
            </template>
            <span v-if="hiddenTagCount">{{ hiddenTagLabel }}</span>
          </div>

          <h2 class="text-xl font-bold line-clamp-2 dark:text-hana-white">
            {{ title }}
          </h2>

          <p class="text-sm text-text line-clamp-2 dark:text-hana-white-700">
            {{ normalizedDescription }}
          </p>

          <div class="mt-auto flex items-end justify-between border-t border-primary/35 pt-3 dark:border-hana-black-200/55">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text font-code dark:text-hana-white-700">
              <span class="inline-flex items-center gap-1.5">
                <Icon name="lucide:calendar" size="12" />
                <time :datetime="publishedAt">{{ publishedAt }}</time>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Icon name="lucide:file-text" size="12" />
                <span>{{ wordCount }}字</span>
              </span>
            </div>
            <Icon
              name="lucide:arrow-right"
              size="16"
              class="text-text-3 transition-transform duration-300 ease-out group-hover:translate-x-1 dark:text-hana-white-700"
            />
          </div>
        </div>
      </div>

      <div v-else class="h-full flex flex-col md:min-h-50 md:flex-row">
        <div class="order-1 h-48 w-full shrink-0 overflow-hidden border-b border-primary/35 md:order-2 md:h-auto md:max-w-80 md:w-2/5 md:border-b-0 md:border-l dark:border-hana-black-200/55">
          <NuxtImg
            :src="cover"
            :alt="coverAlt"
            class="size-full transition-transform duration-700 ease-out object-cover group-hover:scale-105"
          />
        </div>

        <div class="order-2 min-w-0 flex flex-1 flex-col gap-2 p-5 md:order-1 md:p-6">
          <div class="min-h-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-3 font-medium tracking-[0.18em] font-code uppercase dark:text-hana-white-700/85">
            <template v-for="(tag, i) in visibleTags" :key="tag">
              <span>{{ tag }}</span>
              <span v-if="i < visibleTags.length - 1 || hiddenTagCount" class="opacity-50">·</span>
            </template>
            <span v-if="hiddenTagCount">{{ hiddenTagLabel }}</span>
          </div>

          <h2 class="text-lg font-bold line-clamp-2 md:text-xl dark:text-hana-white">
            {{ title }}
          </h2>

          <p class="text-sm/7 text-text-3 line-clamp-2 dark:text-hana-white-700 md:line-clamp-3">
            {{ normalizedDescription }}
          </p>

          <div class="mt-auto flex items-end justify-between border-t border-primary/35 pt-3 dark:border-hana-black-200/55">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text tracking-[0.03em] font-code dark:text-hana-white-700">
              <span class="inline-flex items-center gap-1.5">
                <Icon name="lucide:calendar" size="12" />
                <time :datetime="publishedAt">{{ publishedAt }}</time>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Icon name="lucide:file-text" size="12" />
                <span>{{ wordCount }}字</span>
              </span>
            </div>
            <Icon
              name="lucide:arrow-right"
              size="16"
              class="text-text-3 transition-transform duration-300 ease-out group-hover:translate-x-1 dark:text-hana-white-700"
            />
          </div>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
