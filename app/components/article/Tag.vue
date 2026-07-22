<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  size?: 'small' | 'medium' | 'large'
  to?: string
  count?: number
  variant?: 'default' | 'card'
}>(), {
  size: 'medium',
  variant: 'default',
})

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'span'
})

const chipClass = computed(() => {
  const sizeClass = props.size === 'small'
    ? 'px-2.5 py-1 text-[11px] leading-none'
    : props.size === 'large'
      ? 'px-4 py-2 text-sm leading-none'
      : 'px-3 py-1.5 text-xs leading-none'

  if (props.variant === 'card') {
    return [
      'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-primary/55 bg-hana-white/80 text-text font-code uppercase tracking-[0.03em] dark:border-hana-black-200/80 dark:bg-hana-black-700/72 dark:text-hana-white-700',
      sizeClass,
      props.to
        ? 'cursor-pointer transition-colors hover:border-hana-blue/35 hover:text-hana-blue dark:hover:border-hana-blue-300/40 dark:hover:text-hana-blue-200'
        : 'cursor-default',
    ]
  }

  return [
    'inline-flex items-center justify-center select-none whitespace-nowrap rounded-md bg-hana-black text-white dark:bg-hana-white-700 dark:text-hana-black',
    props.size === 'small' ? 'px-2 py-0.5 text-sm' : 'px-4 py-2',
    props.to ? 'cursor-pointer transition-opacity hover:opacity-80' : 'cursor-default',
  ]
})
</script>

<template>
  <component
    :is="component"
    v-if="!count"
    :to="to"
    :class="chipClass"
  >
    {{ name }}
  </component>
  <NuxtLink
    v-else
    :to="`/articles/tags/filter?tag=${name}`"
    class="cursor-pointer whitespace-nowrap transition-all hover:text-hana-blue dark:hover:text-hana-blue-200"
    :class="{
      'text-2xl text-error-2': count >= 5,
      'text-xl text-hana-blue-300': count >= 3 && count < 5,
      'text-base text-primary-300': count < 3,
    }"
  >
    {{ name }}
  </NuxtLink>
</template>
