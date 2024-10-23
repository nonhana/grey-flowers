<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'common' | 'icon' | 'link'
    text?: string
    icon?: string
    to?: string
    active?: boolean
  }>(),
  {
    type: 'common',
    text: '默认按钮',
    active: false,
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
    class="flex shrink-0 cursor-pointer select-none items-center gap-1 rounded-full transition-all hover:bg-great-blue-200/40 hover:text-great-blue active:scale-95 active:bg-great-blue-200"
    :class="[type === 'common' ? 'px-[10px] py-2' : 'p-2', active ? 'bg-great-blue-200/40 text-great-blue' : 'text-text']"
    @click="emits('click')"
  >
    <Icon v-if="icon" :name="icon" size="20" />
    <span v-if="type === 'common'">{{ text }}</span>
  </component>
</template>
