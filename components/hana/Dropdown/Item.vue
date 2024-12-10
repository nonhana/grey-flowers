<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'common' | 'link'
  icon?: string
  to?: string
  active?: boolean
  command?: string
  center?: boolean
}>(), {
  type: 'common',
  active: false,
  center: false,
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
    class="flex min-w-[100px] shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg px-[10px] py-2 transition-all hover:bg-hana-blue-150 hover:text-hana-blue active:scale-95 active:bg-hana-blue-200"
    :class="[active ? 'text-hana-blue' : 'text-text', center ? 'justify-center' : 'justify-start']"
    v-bind="command ? { 'data-command': command } : {}"
  >
    <Icon v-if="icon" :name="icon" size="20" />
    <slot />
  </component>
</template>
