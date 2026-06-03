<script lang="ts" setup>
import { useStore } from '~/store'

const route = useRoute()
const { articleStore, dialogStore, uiInfoStore } = useStore()
const { content, neighbors } = toRefs(articleStore)

const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

const isArticlePage = computed(() => route.name === ARTICLE_DETAIL_PAGE)
const baseVisible = computed(() =>
  isClient.value
  && isArticlePage.value
  && uiInfoStore.breakpoints.smaller('xl').value,
)
const buttonVisible = computed(() => baseVisible.value && dialogStore.dialogCount === 0)

const drawerVisible = ref(false)

function toggleDrawer() {
  drawerVisible.value = !drawerVisible.value
}
</script>

<template>
  <div v-if="baseVisible">
    <div v-if="buttonVisible" class="relative hana-card">
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
      <ArticleDrawer
        v-if="content?.toc"
        v-model="drawerVisible"
        :toc="content.toc"
        :prev="neighbors[0]"
        :next="neighbors[1]"
      />
    </div>
  </div>
</template>
