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
    darkMode?: boolean
  }>(),
  {
    type: 'common',
    active: false,
    shape: 'round',
    disabled: false,
    showSlot: true,
    darkMode: false,
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
    :to="to"
    class="flex shrink-0 select-none items-center justify-center gap-1 transition-all"
    :class="[
      type === 'common' ? 'px-[10px] py-2' : 'p-2',
      active
        ? darkMode ? 'bg-hana-blue/80' : 'bg-hana-blue-200/40 text-hana-blue'
        : darkMode ? 'bg-hana-blue text-white' : 'text-text',
      darkMode ? 'hover:bg-hana-blue/80' : 'hover:bg-hana-blue-200/40 hover:text-hana-blue',
      shape === 'round' ? 'rounded-full' : 'rounded-lg',
      disabled ? 'cursor-not-allowed text-gray-400 opacity-50' : 'cursor-pointer active:scale-95 active:bg-hana-blue-200',
    ]"
    @click="handleClick"
  >
    <Icon v-if="props.icon" :name="props.icon" size="20" />
    <slot v-if="showSlot" />
  </component>
</template>
