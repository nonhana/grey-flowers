<script lang="ts" setup>
const props = defineProps<{
  ids: string
}>()

const query = computed(() => ({ ids: props.ids }))
const { data, error } = useFetch('/api/music/list', { query, server: false })

const tracks = computed(() => data.value?.payload ?? null)
const notice = computed(() => {
  if (error.value)
    return '音乐加载失败，请稍后刷新重试。'
  if (tracks.value?.length === 0)
    return '曲目已不可用。'
  return ''
})
</script>

<template>
  <div class="max-w-2xl">
    <RecentlyMusicCard v-if="tracks?.length" :music="tracks" />
    <p
      v-else-if="notice"
      class="m-0 w-full border border-primary-300 rounded-xl bg-white p-4 text-sm text-text dark:border-hana-black-600 dark:bg-hana-black dark:text-hana-white-700"
    >
      {{ notice }}
    </p>
    <!-- placeholder -->
    <div
      v-else
      aria-hidden="true"
      class="h-46.5 w-full border border-primary-300 rounded-xl bg-white animate-pulse sm:h-34.5 dark:border-hana-black-600 dark:bg-hana-black"
    />
  </div>
</template>
