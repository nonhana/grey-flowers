<script setup lang="ts">
const props = withDefaults(defineProps<{
  separator?: string
  separatorIcon?: string
}>(), {
  separator: '>',
})

const breadcrumbRef = ref<HTMLDivElement>()

provide('breadcrumbKey', props)

onMounted(() => {
  if (breadcrumbRef.value) {
    const items = breadcrumbRef.value.querySelectorAll('#breadcrumb-item')
    if (items.length) {
      items[items.length - 1].setAttribute('aria-current', 'page')
    }
  }
})
</script>

<template>
  <div ref="breadcrumbRef" class="my-5 text-text">
    <slot />
  </div>
</template>
