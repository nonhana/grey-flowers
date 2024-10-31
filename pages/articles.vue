<script setup lang="ts">
const route = useRoute()
const { path, name } = toRefs(route)

const menus = new Map([
  ['/articles', { title: '文章', icon: 'lucide:file-text', to: '/articles' }],
  ['/articles/tags', { title: '标签', icon: 'lucide:tag', to: '/articles/tags' }],
  ['/articles/categories', { title: '分类', icon: 'lucide:folder', to: '/articles/categories' }],
  ['/articles/archives', { title: '归档', icon: 'lucide:archive', to: '/articles/archives' }],
])

const isDetail = computed(() => (name.value as string)!.startsWith('article-detail'))
const curPathArr = computed(() => {
  return path.value
    .split('/')
    .reduce((acc, cur) => {
      if (cur)
        acc.push(`${acc[acc.length - 1]}/${cur}`)
      else acc.push('')
      return acc
    }, [] as string[])
    .filter(Boolean)
    .map(to => ({ to, title: menus.get(to)?.title }))
})
</script>

<template>
  <div>
    <transition name="title">
      <h1 v-if="!isDetail" class="inline-block cursor-pointer font-bold text-hana-blue with_underline">
        一些文章
      </h1>
    </transition>
    <div class="flex flex-col gap-5 lg:flex-row lg:gap-20">
      <transition name="side-menu">
        <HanaSideMenu v-if="!isDetail" :menus="menus" />
      </transition>
      <div>
        <HanaBreadcrumb>
          <HanaBreadcrumbItem v-for="item in curPathArr" :key="item.to" :to="item.to">
            {{ item.title }}
          </HanaBreadcrumbItem>
        </HanaBreadcrumb>
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
