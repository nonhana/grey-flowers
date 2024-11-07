<script setup lang="ts">
const { t } = useI18n()

const curRouteArr = useRouteArr()
const route = useRoute()
const { name } = toRefs(route)

const menus = new Map([
  ['/articles', { title: t('pageMeta.articles.name'), icon: 'lucide:file-text', to: '/articles' }],
  ['/articles/tags', { title: t('pageMeta.articles.tags.name'), icon: 'lucide:tag', to: '/articles/tags' }],
  ['/articles/categories', { title: t('pageMeta.articles.categories.name'), icon: 'lucide:folder', to: '/articles/categories' }],
  ['/articles/archives', { title: t('pageMeta.articles.archives.name'), icon: 'lucide:archive', to: '/articles/archives' }],
])

const isDetail = computed(() => (name.value as string)!.startsWith('article-detail'))
</script>

<template>
  <div>
    <div class="flex flex-col lg:flex-row lg:items-center lg:gap-20">
      <transition name="title">
        <h1 v-if="!isDetail" class="m-0 inline-block w-40 cursor-pointer text-center font-bold text-hana-blue with_underline">
          一些文章
        </h1>
      </transition>
      <HanaBreadcrumb>
        <HanaBreadcrumbItem v-for="item in curRouteArr" :key="item.to" :to="item.to">
          {{ item.title }}
        </HanaBreadcrumbItem>
      </HanaBreadcrumb>
    </div>
    <div class="flex flex-col gap-5 lg:flex-row lg:gap-20">
      <transition name="side-menu">
        <HanaSideMenu v-if="!isDetail" :menus="menus" />
      </transition>
      <div class="w-full">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>

<style scoped>
.side-menu-enter-from,
.side-menu-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.side-menu-enter-active,
.side-menu-leave-active {
  transition: all 0.3s ease;
}

.side-menu-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.title-enter-from,
.title-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.title-enter-active,
.title-leave-active {
  transition: all 0.3s ease;
}

.title-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>
