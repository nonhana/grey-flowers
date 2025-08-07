<script setup lang="ts">
defineProps<{
  menus: Map<string, {
    title: string
    icon: string
    to: string
  }>
}>()

const route = useRoute()
const { path } = toRefs(route)
</script>

<template>
  <div class="relative mx-auto size-fit max-w-full flex shrink-0 flex-row gap-2 overflow-auto hana-card lg:mx-0 lg:flex-col lg:gap-4">
    <NuxtLink
      v-for="[to, value] in menus"
      :key="to"
      :to="to"
      :aria-label="value.title"
      class="group w-auto hana-button justify-between text-base lg:w-36 md:text-xl"
      :class="{ 'hana-button--active': path === to }"
    >
      <div class="flex items-center gap-2">
        <Icon :name="value.icon" />
        <span>{{ value.title }}</span>
      </div>
      <Icon
        name="lucide:arrow-right"
        class="opacity-0 transition-all animate-bounce-x group-hover:opacity-100 hidden! lg:block!"
        :class="[path === to ? 'animate-none opacity-100' : '']"
      />
    </NuxtLink>
  </div>
</template>
