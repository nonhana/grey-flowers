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
  <div class="hana-card relative mx-auto flex size-fit max-w-full shrink-0 flex-row gap-2 overflow-auto lg:mx-0 lg:flex-col lg:gap-4">
    <NuxtLink
      v-for="[to, value] in menus"
      :key="to"
      :to="to"
      :aria-label="value.title"
      class="group hana-button justify-between w-auto text-base md:text-xl lg:w-36"
      :class="{ 'hana-button--active': path === to }"
    >
      <div class="flex items-center gap-2">
        <Icon :name="value.icon" />
        <span>{{ value.title }}</span>
      </div>
      <Icon
        name="lucide:arrow-right"
        class="hidden animate-bounce-x opacity-0 transition-all group-hover:opacity-100 lg:block"
        :class="[path === to ? 'animate-none opacity-100' : '']"
      />
    </NuxtLink>
  </div>
</template>
