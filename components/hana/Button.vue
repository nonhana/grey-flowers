<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'common' | 'icon' | 'link'
    text?: string
    icon?: string
    to?: string
    active?: boolean
    shape?: 'round' | 'square'
  }>(),
  {
    type: 'common',
    text: '默认按钮',
    active: false,
    shape: 'round',
  },
)

const emits = defineEmits<{
  click: []
}>()

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'div'
})
</script>

<template>
  <component
    :is="component"
    :to="to"
    class="flex shrink-0 cursor-pointer select-none items-center gap-1 transition-all hover:bg-hana-blue-200/40 hover:text-hana-blue active:scale-95 active:bg-hana-blue-200"
    :class="[type === 'common' ? 'px-[10px] py-2' : 'p-2', active ? 'bg-hana-blue-200/40 text-hana-blue' : 'text-text', shape === 'round' ? 'rounded-full' : 'rounded-lg']"
    @click="emits('click')"
  >
    <Icon v-if="icon" :name="icon" size="20" />
    <span v-if="type === 'common'">{{ text }}</span>
  </component>
</template>
