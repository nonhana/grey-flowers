<script setup lang="ts">
definePageMeta({
  name: 'archives',
})

const route = useRoute()
const router = useRouter()

const { data: count } = await useAsyncData('article-count', () => $fetch('/api/articles/count'))

const { data: articleData } = await useAsyncData('articles-by-publishedAt', () => queryContent('articles')
  .only(['publishedAt'])
  .sort({ publishedAt: -1 })
  .find())

const dateMap = computed<Map<string, string[]>>(() => {
  const map: Map<string, Set<string>> = new Map()
  if (!articleData.value)
    return new Map()

  articleData.value.forEach((article) => {
    const publishedDate = new Date(article.publishedAt)
    const year = publishedDate.getFullYear().toString()
    const month = (publishedDate.getMonth() + 1).toString()

    if (!map.has(year)) {
      map.set(year, new Set())
    }
    map.get(year)!.add(month)
  })

  return new Map(
    Array.from(map.entries()).map(([year, monthsSet]) => [year, Array.from(monthsSet)]),
  )
})

const curYear = ref<string>(route.query.year as string || dateMap.value.keys().next().value!)
const curMonth = ref<string>(route.query.month as string || dateMap.value.get(curYear.value)![0])

function toggleYear(year: string) {
  curYear.value = year
}

function toggleMonth(month: string) {
  curMonth.value = month
}

watch(curYear, (newYear) => {
  router.replace({ query: { ...route.query, year: newYear, month: dateMap.value.get(newYear)![0] } })
}, { immediate: true })

watch(() => route.query.year, (yearQuery) => {
  const newYear = yearQuery as string || dateMap.value.keys().next().value!
  if (newYear !== curYear.value) {
    curYear.value = newYear
  }
})

watch(curMonth, (newMonth) => {
  router.replace({ query: { ...route.query, month: newMonth } })
})

watch(() => route.query.month, (monthQuery) => {
  const newMonth = monthQuery as string || dateMap.value.get(curYear.value)![0]
  if (newMonth !== curMonth.value) {
    curMonth.value = newMonth
  }
})
</script>

<template>
  <div>
    <header class="mb-5 flex flex-col gap-5">
      <div class="text-xl text-hana-blue">
        <span>目前共计 <span class="font-bold">{{ count }}</span> 篇文章...继续加油</span>
      </div>
      <div class="hana-card flex gap-2 overflow-auto">
        <div
          v-for="year in dateMap.keys()"
          :key="year"
          :class="{ 'hana-button--active': curYear === year }"
          class="hana-button inline-block"
          @click="toggleYear(year)"
        >
          <span>{{ year }}</span>
        </div>
      </div>
      <div class="hana-card flex gap-2 overflow-auto">
        <div
          v-for="month in dateMap.get(curYear)"
          :key="month"
          :class="{ 'hana-button--active': curMonth === month }"
          class="hana-button inline-block"
          @click="toggleMonth(month)"
        >
          <span>{{ month }} 月</span>
        </div>
      </div>
    </header>
    <main>
      <ArticleMain type="archives" />
    </main>
  </div>
</template>
