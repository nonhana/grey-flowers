<script setup lang="ts">
import type { Toc, TocLink } from '@nuxt/content'

const props = defineProps<{ toc: Toc }>()

const links = props.toc.links || []
const linkIds = computed(() => {
  const result: string[] = []
  const collectIds = (links: TocLink[]) => {
    links.forEach((link) => {
      result.push(link.id)
      if (link.children) {
        collectIds(link.children)
      }
    })
  }
  collectIds(links)
  return result
})

const route = useRoute()
const { hash } = toRefs(route)

const activatedId = ref<string | null>(null)
const activatedIdLock = ref(false)

const debouncedScrollIntoView = useDebounceFn((id: string) => {
  const targetItem = document.getElementById(`toc-${id}`)
  targetItem && targetItem.scrollIntoView({ behavior: 'smooth' })
}, 100)

watch(activatedId, (newV) => {
  if (newV === null)
    return
  debouncedScrollIntoView(newV)
})

let linkObserver: IntersectionObserver | null = null

onMounted(() => {
  activatedId.value = hash.value.slice(1)
  linkObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (activatedIdLock.value)
          return
        activatedId.value = entry.target.id
      }
    })
  }, {
    rootMargin: '0% 0% -80% 0%',
  })

  linkIds.value.forEach((id) => {
    const element = document.getElementById(id)
    if (element) {
      linkObserver && linkObserver.observe(element)
    }
  })
})

onUnmounted(() => {
  linkObserver && linkObserver.disconnect()
})

watch(hash, (newHash, _, onCleanup) => {
  activatedIdLock.value = true
  activatedId.value = newHash.slice(1)
  const timeout = setTimeout(() => {
    activatedIdLock.value = false
  }, 1000)
  onCleanup(() => {
    clearTimeout(timeout)
  })
})
</script>

<template>
  <div class="h-fit w-60 shrink-0 justify-self-end hana-card">
    <div class="flex items-center gap-2 text-xl">
      <Icon name="lucide:list" />
      <span>文章目录</span>
    </div>
    <hr class="my-2 border-text dark:border-hana-white-700">
    <div v-if="links.length > 0 && activatedId !== null" class="max-h-60 flex flex-col gap-1 overflow-auto">
      <ArticleTocItem v-for="link in links" :key="link.id" :link="link" :activated-id="activatedId" />
    </div>
    <div v-else-if="links.length === 0" class="flex flex-col items-center gap-2 py-4 text-text dark:text-hana-white-700">
      <Icon name="lucide:file-text" size="32" />
      <span>暂无目录</span>
    </div>
    <div v-else class="flex flex-col items-center gap-2 py-4 text-text dark:text-hana-white-700">
      <Icon name="lucide:loader-circle" size="32" class="animate-spin" />
      <span>加载中...</span>
    </div>
  </div>
</template>
