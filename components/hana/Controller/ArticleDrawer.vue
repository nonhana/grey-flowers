<script lang="ts" setup>
import type { Toc } from '@nuxt/content'
import { useStore } from '~/store'

const route = useRoute()
const { articleStore, dialogStore } = useStore()
const { content, neighbors } = toRefs(articleStore)

const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

const isMobile = ref(false)
if (import.meta.client) {
  const { width: windowWidth } = useWindowSize()
  watchEffect(() => {
    isMobile.value = windowWidth.value < 1280
  })
}

const isArticlePage = computed(() => route.name === 'article-detail')
const visible = computed(() =>
  isClient.value && dialogStore.dialogCount === 0 && isArticlePage.value && isMobile.value,
)

const drawerVisible = ref(false)

function toggleDrawer() {
  drawerVisible.value = !drawerVisible.value
}
</script>

<template>
  <div v-if="visible">
    <div class="relative hana-card">
      <HanaTooltip content="打开文章目录" position="left" animation="slide">
        <div
          class="size-10 hana-button items-center justify-center"
          @click="toggleDrawer"
        >
          <Icon class="absolute" name="lucide:menu" size="20" />
        </div>
      </HanaTooltip>
    </div>
    <div class="block xl:hidden">
      <ArticleDrawer v-if="content" v-model="drawerVisible" :toc="content.body.toc as Toc" :prev="neighbors[0]" :next="neighbors[1]" />
    </div>
  </div>
</template>
