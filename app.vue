<script setup lang="ts">
import { siteMetaData } from '~/data/meta'

const route = useRoute()

const initializing = ref(route.meta.name !== 'article-detail')

onMounted(() => initializing.value = false)

useHead({
  htmlAttrs: {
    lang: 'zh-Hans',
  },
})

useSeoMeta(siteMetaData)
</script>

<template>
  <transition name="page">
    <HanaLoading v-if="initializing" />
  </transition>
  <div v-show="!initializing" class="bg-hana-blue-200/10 background-grid dark:bg-hana-black-900 dark:background-grid-dark">
    <NuxtLoadingIndicator color="#6CB9D8" />
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
