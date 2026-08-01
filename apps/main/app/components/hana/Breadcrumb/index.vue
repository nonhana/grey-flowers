<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'

const props = withDefaults(defineProps<{
  separator?: string
  separatorIcon?: LucideIcon
}>(), {
  separator: '>',
})

const route = useRoute()
const isArticleDetail = computed(() => route.name === ARTICLE_DETAIL_PAGE)

const breadcrumbRef = useTemplateRef('breadcrumbRef')

provide('breadcrumbKey', props)

onMounted(() => {
  if (breadcrumbRef.value) {
    const items = breadcrumbRef.value.querySelectorAll('#breadcrumb-item')
    if (items.length) {
      [...items].at(-1)!.setAttribute('aria-current', 'page')
    }
  }
})
</script>

<template>
  <div
    ref="breadcrumbRef"
    class="mx-auto my-5 flex overflow-auto text-text dark:text-hana-white-700"
    :class="[isArticleDetail && 'max-w-5xl']"
  >
    <slot />
  </div>
</template>
