<script setup lang="ts">
const { articlesMap } = useRoutesMap()

const curRouteArr = useRoutesArr()
const route = useRoute()
const { name } = toRefs(route)

const isDetail = computed(() => (name.value as string)!.startsWith('article-detail'))

const showPage = ref(true)

watch(isDetail, (_, __, onCleanup) => {
  showPage.value = false
  const timeout = setTimeout(() => {
    showPage.value = true
  }, 300)
  onCleanup(() => clearTimeout(timeout))
})
</script>

<template>
  <div>
    <div class="flex flex-col lg:flex-row lg:items-center lg:gap-20">
      <transition name="title">
        <h1 v-if="!isDetail" class="m-0 inline-block w-40 cursor-pointer text-center font-bold text-hana-blue with-underline">
          一些文章
        </h1>
      </transition>
      <div class="w-full overflow-auto">
        <HanaBreadcrumb>
          <HanaBreadcrumbItem v-for="item in curRouteArr" :key="item.to" :to="item.to">
            <span class="text-nowrap">{{ item.title }}</span>
          </HanaBreadcrumbItem>
        </HanaBreadcrumb>
      </div>
    </div>
    <div class="flex flex-col gap-5 lg:flex-row lg:gap-20">
      <transition name="side-menu">
        <ArticleSideMenu v-if="!isDetail" :menus="articlesMap" />
      </transition>
      <div v-if="showPage" class="w-full">
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
