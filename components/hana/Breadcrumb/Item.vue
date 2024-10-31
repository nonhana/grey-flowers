<script setup lang="ts">
const props = defineProps<{
  to?: string
}>()

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'div'
})

const breadcrumbContext = inject('breadcrumbKey', undefined) as any
</script>

<template>
  <span id="breadcrumb-item">
    <component
      :is="component"
      v-bind="to ? { to } : {}"
      class="transition-all"
      :class="{ 'font-bold text-black hover:text-hana-blue': to }"
    >
      <slot />
    </component>
    <Icon v-if="breadcrumbContext?.separatorIcon" id="separator" :name="breadcrumbContext?.separatorIcon" />
    <span v-else id="separator" class="mx-2 font-bold">{{ breadcrumbContext?.separator }}</span>
  </span>
</template>

<style scoped lang="scss">
#breadcrumb-item {
  &:last-child {
    #separator {
      display: none;
    }
  }
}
</style>
