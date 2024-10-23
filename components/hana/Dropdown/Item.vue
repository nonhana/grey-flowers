<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'common' | 'link'
  icon?: string
  to?: string
  active?: boolean
  command?: string
}>(), {
  type: 'common',
  active: false,
})

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'li'
})
</script>

<template>
  <component
    :is="component"
    :to="to"
    class="flex min-w-[100px] shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg px-[10px] py-2 transition-all hover:bg-great-blue-200/40 hover:text-great-blue active:scale-95 active:bg-great-blue-200"
    :class="[active ? 'text-great-blue' : 'text-text']"
    v-bind="command ? { 'data-command': command } : {}"
  >
    <Icon v-if="icon" :name="icon" size="20" />
    <slot />
  </component>
</template>
