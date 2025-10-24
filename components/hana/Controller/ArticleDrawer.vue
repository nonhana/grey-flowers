<script lang="ts" setup>
import type { Toc } from '@nuxt/content'
import { useStore } from '~/store'

const { articleStore } = useStore()
const { content, neighbors } = toRefs(articleStore)

const drawerVisible = ref(false)

function toggleDrawer() {
  drawerVisible.value = !drawerVisible.value
}
</script>

<template>
  <div class="relative hana-card">
    <HanaTooltip content="打开文章目录" position="left" animation="slide">
      <div
        class="size-10 hana-button items-center justify-center"
        @click="toggleDrawer"
      >
        <Icon name="lucide:menu" />
      </div>
    </HanaTooltip>
  </div>
  <div class="block xl:hidden">
    <ArticleDrawer v-if="content" v-model="drawerVisible" :toc="content.body.toc as Toc" :prev="neighbors[0]" :next="neighbors[1]" />
  </div>
</template>
