<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Category',
})

const { title } = toRefs(props)

const imgUrl = computed(() => `/categories/${flatStr(title.value)}.webp`)

const { data: articleData } = await useAsyncData(`articles-by-category-${title.value}`, () => queryContent('articles')
  .where({ category: title.value })
  .limit(6)
  .without('body')
  .sort({ publishedAt: -1 })
  .find())

const isFlipped = ref(false)
</script>

<template>
  <div
    class="relative h-56 perspective-10"
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
        <NuxtImg :src="imgUrl" :alt="title" class="absolute -z-10 size-full rounded-lg object-cover" />
        <span class="relative select-none">{{ title }}</span>
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
              class="leading-5 with_underline hover:text-hana-blue"
              :to="`/articles/categories/${flatStr(title)}`"
            >
              {{ title }}
            </NuxtLink>
          </header>
          <main class="mt-5 grid grid-cols-2">
            <NuxtLink
              v-for="article in articleData"
              :key="article._id"
              :to="article._path"
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
              <span>{{ articleData?.length || 0 }} 篇文章</span>
            </div>
            <HanaButton :to="`/articles/categories/${flatStr(title)}`">
              more
            </HanaButton>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>
