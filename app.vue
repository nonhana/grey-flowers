<script setup lang="ts">
import { siteMetaData } from '~/data/meta'

const route = useRoute()

const initializing = ref(route.name !== ARTICLE_DETAIL_PAGE)

onMounted(() => initializing.value = false)

useHead({
  htmlAttrs: {
    lang: 'zh-Hans',
  },
})

useSeoMeta(siteMetaData)

const colorMode = useColorMode()
const indicatorColor = computed(() =>
  colorMode.value === 'light'
    ? 'oklch(0.5 0.1102 250.04)'
    : 'oklch(0.84 0.0632 214.03)',
)
</script>

<template>
  <transition name="page">
    <HanaLoading v-if="initializing" />
  </transition>
  <div v-show="!initializing" class="bg-hana-blue-200/10 background-grid dark:bg-hana-black-900">
    <NuxtLoadingIndicator :color="indicatorColor" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.layout-enter-active,
.layout-leave-active {
  transition: all 0.2s;
}
.layout-enter-from,
.layout-leave-to {
  opacity: 0;
}

html.dark{
  color-scheme: dark;
}
</style>
