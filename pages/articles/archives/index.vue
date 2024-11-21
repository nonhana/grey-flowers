<script setup lang="ts">
definePageMeta({
  name: 'archives',
})

const route = useRoute()
const router = useRouter()

// 文章总数
const { data: count } = await useAsyncData('article-count', () => $fetch('/api/articles/count'))
// 文章日期，key 为年份，value 为该年份下的月份数组
const { data: dateMap } = await useAsyncData('articles-by-publishedAt', () => $fetch('/api/articles/dates'))

const yearList = computed(() =>
  dateMap.value ? Object.keys(dateMap.value).sort((a, b) => Number(b) - Number(a)) : [],
)
const curYear = ref<string | null>(null)

const monthList = computed(() =>
  curYear.value && dateMap.value && dateMap.value[curYear.value]
    ? [...dateMap.value[curYear.value]].sort((a, b) => Number(b) - Number(a))
    : [],
)
const curMonth = ref<string | null>(null)

function syncQueryToState() {
  const yearFromQuery = route.query.year as string
  const monthFromQuery = route.query.month as string

  // 如果查询参数不存在，拿到最新的年份和月份
  const defaultYear = yearList.value[0] || null
  const defaultMonth = monthList.value[0] || null

  curYear.value = yearFromQuery || defaultYear
  curMonth.value = monthFromQuery || defaultMonth

  // 更新到最新的查询参数
  if (!yearFromQuery || !monthFromQuery) {
    updateQuery({ year: curYear.value!, month: curMonth.value! })
  }
}

// 更新查询参数
function updateQuery(params: { year?: string, month?: string }) {
  const newQuery = { ...route.query, ...params }
  if (JSON.stringify(route.query) !== JSON.stringify(newQuery)) {
    router.replace({ query: newQuery })
  }
}

watch(
  () => route.query,
  () => { syncQueryToState() },
  { immediate: true },
)

watch(curYear, (newYear) => {
  if (newYear) {
    updateQuery({ year: newYear, month: monthList.value[0] })
  }
})
watch(curMonth, (newMonth) => {
  if (newMonth) {
    updateQuery({ month: newMonth })
  }
})

syncQueryToState()

function toggleYear(year: string) {
  curYear.value = year
}

function toggleMonth(month: string) {
  curMonth.value = month
}
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
      <div v-if="monthList.length" class="hana-card flex gap-2 overflow-auto">
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
