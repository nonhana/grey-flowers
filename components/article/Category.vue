<script setup lang="ts">
const props = defineProps<{
  category: {
    id: number
    name: string
    cover: string | null
    articleCount: number
  }
  index: number
}>()

const { data } = await useFetch('/api/articles/list', {
  query: { category: props.category.name, page: 1, pageSize: 6 },
})

const articleData = computed(() => data.value ? data.value.payload : [])

const isFlipped = ref(false)

const opacity = ref(0)
const top = ref('10px')

function resetAnimation() {
  opacity.value = 0
  top.value = '10px'
  setTimeout(() => {
    opacity.value = 1
    top.value = '0'
  }, 0)
}

onMounted(() => {
  resetAnimation()
})

watch(() => props.index, () => resetAnimation)
</script>

<template>
  <div
    class="relative h-56 perspective-10"
    :style="{ transition: `all 0.2s ${index * 0.1}s`, opacity, top }"
    @mouseenter="isFlipped = true"
    @mouseleave="isFlipped = false"
  >
    <div
      class="relative size-full transition-transform duration-700 transform-style-3d"
      :class="{ 'rotate-y-180': isFlipped }"
    >
      <div
        class="absolute inset-0 flex items-center justify-center rounded-lg text-xl font-bold text-white backface-hidden"
      >
        <NuxtImg :src="category.cover || ''" :alt="category.name" class="absolute -z-10 size-full rounded-lg object-cover" />
        <span class="relative select-none">{{ category.name }}</span>
      </div>
      <div
        class="absolute inset-0 rounded-lg bg-white p-4 shadow-md backface-hidden rotate-y-180"
      >
        <div class="relative size-full">
          <header class="flex w-fit items-center gap-1 text-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
            <NuxtLink
              class="leading-5 with-underline hover:text-hana-blue"
              :to="`/articles/categories/${flatStr(category.name)}`"
              :aria-label="`前往 ${category.name} 目录`"
              :title="category.name"
            >
              {{ category.name }}
            </NuxtLink>
          </header>
          <main class="mt-5 grid grid-cols-2">
            <NuxtLink
              v-for="article in articleData"
              :key="article.id"
              :to="article.to"
              :aria-label="article.title"
              :title="article.title"
              class="hana-button"
            >
              <span class="line-clamp-1">
                {{ article.title || '暂无标题' }}
              </span>
            </NuxtLink>
          </main>
          <footer class="absolute bottom-0 left-0 flex w-full justify-between text-text">
            <div class="flex items-center gap-1 ">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8m8 4H8m8 4H8" />
                </g>
              </svg>
              <span>{{ category.articleCount }} 篇文章</span>
            </div>
            <HanaButton
              :to="`/articles/categories/${flatStr(category.name)}`"
              :aria-label="`前往 ${category.name} 目录`"
              shape="square"
            >
              more
            </HanaButton>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>
