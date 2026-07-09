<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { Search } from '@lucide/vue'

const route = useRoute()
const dialogVisible = ref(false)
const triggerRef = useTemplateRef<ComponentPublicInstance>('trigger')

function focusTrigger() {
  const element = triggerRef.value?.$el as HTMLElement | undefined
  element?.focus()
}

watch(dialogVisible, (isVisible, wasVisible) => {
  if (!isVisible && wasVisible) {
    nextTick(() => focusTrigger())
  }
})

watch(() => route.fullPath, () => {
  dialogVisible.value = false
})
</script>

<template>
  <div>
    <HanaButton
      ref="trigger"
      icon-button
      :icon="Search"
      aria-label="搜索文章"
      @click="dialogVisible = true"
    />
    <SearchDialog v-model="dialogVisible" />
  </div>
</template>
