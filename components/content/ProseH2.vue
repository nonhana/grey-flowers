<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h2 :id="id" class="w-fit with-underline">
    <NuxtLink
      :to="`#${id}`" class="flex gap-2 font-bold before:font-light before:text-hana-blue-200 before:content-['#'] hover:text-hana-blue"
    >
      <slot />
    </NuxtLink>
  </h2>
</template>
