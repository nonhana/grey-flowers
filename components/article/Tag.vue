<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  size?: 'small' | 'medium' | 'large'
  to?: string
  count?: number
}>(), {
  size: 'medium',
})

const component = computed(() => {
  if (props.to)
    return resolveComponent('NuxtLink')
  return 'button'
})
</script>

<template>
  <component
    :is="component"
    v-if="!count"
    :to="to"
    class="cursor-pointer select-none whitespace-nowrap rounded-md bg-hana-black text-white transition-all dark:bg-hana-white-700 dark:text-hana-black hover:opacity-80"
    :class="[size === 'small' ? 'px-2 py-0.5 text-sm' : 'px-4 py-2']"
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
