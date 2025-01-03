<script setup lang="ts">
const props = defineProps<{
  to?: string
}>()

const route = useRoute()
const { path } = toRefs(route)

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
      class="hana-button inline"
      :class="{
        'hover:text-hana-blue dark:text-hana-blue-200': to,
        'hana-button--active': path === to?.split('?')[0],
      }"
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
