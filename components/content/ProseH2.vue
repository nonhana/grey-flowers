<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
}>(), {
  id: '',
})
</script>

<template>
  <h2 :id="id" class="with-underline w-fit">
    <NuxtLink :to="`#${id}`" class="flex items-center gap-2 font-bold hover:text-hana-blue">
      <Icon name="lucide:pencil" />
      <slot />
    </NuxtLink>
  </h2>
</template>
