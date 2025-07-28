<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: string
    iconButton?: boolean
    icon?: string
    to?: string
    ariaLabel?: string
    active?: boolean
    shape?: 'round' | 'square'
    disabled?: boolean
    showSlot?: boolean
    darkMode?: boolean
  }>(),
  {
    iconButton: false,
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

function handleClick(e: Event) {
  if (!props.disabled) {
    emits('click')
    if (!props.type) {
      e.preventDefault()
    }
  }
  else {
    e.preventDefault()
  }
}
</script>

<template>
  <component
    :is="component"
    :to="to"
    :type="type"
    :aria-label="ariaLabel || (props.iconButton && props.icon) ? props.icon : undefined"
    :title="ariaLabel || undefined"
    class="relative flex shrink-0 select-none items-center justify-center gap-1 transition-all line-height-5"
    :class="[
      iconButton ? 'p-2' : 'px-[10px] py-2',
      active
        ? darkMode ? 'bg-hana-blue/80 dark:bg-hana-white-700/80' : 'bg-hana-blue-150 text-hana-blue dark:bg-hana-black-800 dark:text-hana-white-700'
        : darkMode ? 'bg-hana-blue text-white dark:bg-hana-white-700 dark:text-hana-black' : 'text-text dark:text-hana-white-700',
      darkMode
        ? 'hover:bg-hana-blue/80 active:bg-hana-blue-200 dark:bg-hana-white-700/80 dark:hover:bg-hana-white-700/80 dark:active:bg-hana-white-700'
        : 'hover:bg-hana-blue-150 hover:text-hana-blue active:bg-hana-blue-200 dark:text-hana-white-700 dark:hover:bg-hana-black-800 dark:hover:text-hana-white-700 dark:active:bg-hana-black-800',
      shape === 'round' ? 'rounded-full' : 'rounded-lg',
      disabled ? 'cursor-not-allowed text-gray-400 opacity-50' : 'cursor-pointer active:scale-95',
    ]"
    @click="handleClick"
  >
    <Icon v-if="props.icon" :name="props.icon" size="20" />
    <slot v-if="showSlot" />
    <span v-if="!props.icon && !showSlot && ariaLabel" class="sr-only">{{ ariaLabel }}</span>
  </component>
</template>
