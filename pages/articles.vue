<script setup lang="ts">
const route = useRoute()
const { fullPath, name } = toRefs(route)

const menus = ref<{ id: number, title: string, icon: string, to: string }[]>([
  { id: 0, title: '文章', icon: 'lucide:file-text', to: '/articles' },
  { id: 1, title: '标签', icon: 'lucide:tag', to: '/articles/tags' },
  { id: 2, title: '分类', icon: 'lucide:folder', to: '/articles/categories' },
  { id: 3, title: '归档', icon: 'lucide:archive', to: '/articles/archives' },
])

const activatedId = ref(0)
const isDetail = computed(() => (name.value as string)!.startsWith('article-detail'))
watchEffect(() => {
  const index = menus.value.findIndex(menu => menu.to === fullPath.value)
  activatedId.value = index === -1 ? 0 : index
})
</script>

<template>
  <div>
    <transition name="title">
      <h1 v-if="!isDetail" class="inline-block cursor-pointer font-bold text-hana-blue with_underline">
        一些文章
      </h1>
    </transition>
    <div class="flex gap-20">
      <transition name="side-menu">
        <HanaSideMenu v-if="!isDetail" :menus="menus" :activated-id="activatedId" />
      </transition>
      <NuxtPage />
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
