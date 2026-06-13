<script lang="ts" setup>
import { Menu } from '@lucide/vue'
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
        <Menu class="absolute" :size="20" />
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
</template>
