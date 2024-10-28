<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'common' | 'icon'
    icon?: string
    to?: string
    active?: boolean
    shape?: 'round' | 'square'
    disabled?: boolean
    showSlot?: boolean
  }>(),
  {
    type: 'common',
    active: false,
    shape: 'round',
    disabled: false,
    showSlot: true,
  },
)

const emits = defineEmits<{
  click: []
}>()

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'button'
})

function handleClick(event: Event) {
  if (!props.disabled) {
    emits('click')
  }
  else {
    event.preventDefault()
    event.stopPropagation()
  }
}
</script>

<template>
  <component
    :is="component"
    :to="props.to"
    class="flex shrink-0 select-none items-center gap-1 transition-all"
    :class="[
      type === 'common' ? 'px-[10px] py-2' : 'p-2',
      active ? 'bg-hana-blue-200/40 text-hana-blue' : 'text-text',
      shape === 'round' ? 'rounded-full' : 'rounded-lg',
      {
        'cursor-pointer hover:bg-hana-blue-200/40 hover:text-hana-blue active:scale-95 active:bg-hana-blue-200':
          !props.disabled,
        'cursor-not-allowed text-gray-400 opacity-50': props.disabled,
      },
    ]"
    @click="handleClick"
  >
    <Icon v-if="props.icon" :name="props.icon" size="20" />
    <slot v-if="showSlot" />
  </component>
</template>
