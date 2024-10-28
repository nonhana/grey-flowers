<script setup lang="ts">
interface SideMenuProps {
  menus: {
    id: number
    title: string
    icon: string
    to: string
  }[]
  activatedId: number
}
defineProps<SideMenuProps>()
</script>

<template>
  <div
    class="relative mx-auto flex size-fit shrink-0 flex-row gap-2 overflow-auto rounded-lg bg-white p-2 text-text shadow-md lg:mx-0 lg:flex-col lg:gap-4"
  >
    <NuxtLink
      v-for="menu in menus" :key="menu.id"
      :to="menu.to"
      class="group hana-button w-auto text-base md:text-xl lg:w-36"
      :class="[
        activatedId === menu.id ? 'bg-hana-blue-200/40 text-hana-blue' : '',
      ]"
    >
      <div class="flex items-center gap-2">
        <Icon :name="menu.icon" />
        <span>{{ menu.title }}</span>
      </div>
      <Icon
        name="lucide:arrow-right"
        class="hidden animate-bounce-x opacity-0 transition-all group-hover:opacity-100 lg:block"
        :class="[activatedId === menu.id ? 'animate-none opacity-100' : '']"
      />
    </NuxtLink>
  </div>
</template>
