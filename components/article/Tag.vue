<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  size?: 'small' | 'medium' | 'large'
  to?: string
  count?: number
}>(), {
  size: 'medium',
})

const bgColor = ref('#3d3d3d')

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
    class="cursor-pointer select-none rounded-md transition-all hover:opacity-80"
    :class="[
      isWarmHue(bgColor) ? 'text-black' : 'text-white',
      size === 'small' ? 'px-2 py-0.5 text-sm' : 'px-4 py-2',
    ]"
    :style="{ background: bgColor }"
  >
    {{ name }}
  </component>
  <NuxtLink
    v-else
    :to="`/articles/tags/${name}`"
    class="cursor-pointer transition-all hover:text-hana-blue"
    :class="{
      'text-2xl text-error-2': count >= 5,
      'text-xl text-hana-blue-300': count >= 3 && count < 5,
      'text-base text-primary-300': count < 3,
    }"
  >
    {{ name }}
  </NuxtLink>
</template>
