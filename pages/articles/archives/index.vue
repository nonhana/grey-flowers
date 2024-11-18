<script setup lang="ts">
definePageMeta({
  name: 'archives',
})

const route = useRoute()
const router = useRouter()

const { data: count } = await useAsyncData('article-count', () => $fetch('/api/articles/count'))

const { data: dateMap } = await useAsyncData('articles-by-publishedAt', () => $fetch('/api/articles/dates'))

const yearList = computed(() => dateMap.value ? (Object.keys(dateMap.value)).sort((a, b) => Number(b) - Number(a)) : [])
const curYear = ref<string>(route.query.year as string || yearList.value[0])

const monthList = computed(() => dateMap.value ? [...dateMap.value[curYear.value]].sort((a, b) => Number(b) - Number(a)) : [])
const curMonth = ref<string>(route.query.month as string || monthList.value[0])

function toggleYear(year: string) {
  curYear.value = year
}

function toggleMonth(month: string) {
  curMonth.value = month
}

watch(curYear, (newYear) => {
  router.replace({ query: { ...route.query, year: newYear, month: dateMap.value![newYear][0] } })
}, { immediate: true })

watch(() => route.query.year, (yearQuery) => {
  const newYear = yearQuery as string || yearList.value[0]
  if (newYear !== curYear.value) {
    curYear.value = newYear
  }
})

watch(curMonth, (newMonth) => {
  router.replace({ query: { ...route.query, month: newMonth } })
})

watch(() => route.query.month, (monthQuery) => {
  const newMonth = monthQuery as string || monthList.value[0]
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
          v-for="year in yearList"
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
          v-for="month in monthList"
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
