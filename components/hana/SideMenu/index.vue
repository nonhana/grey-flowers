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

withDefaults(defineProps<SideMenuProps>(), { })
</script>

<template>
  <div class="flex max-h-fit w-40 shrink-0 flex-col gap-2 rounded-lg border bg-white p-2 text-text shadow-md">
    <NuxtLink
      v-for="menu in menus" :key="menu.id"
      :to="menu.to"
      class="group flex min-w-[100px] shrink-0 cursor-pointer select-none items-center justify-between rounded-lg px-[10px] py-2 text-xl transition-all hover:bg-great-blue-200/40 hover:text-great-blue active:scale-95 active:bg-great-blue-200"
      :class="[activatedId === menu.id ? 'bg-great-blue-200/40 text-great-blue' : '']"
    >
      <div class="flex items-center gap-2">
        <Icon :name="menu.icon" />
        <span>{{ menu.title }}</span>
      </div>
      <Icon
        name="lucide:arrow-right" class="animate-bounce-x opacity-0 transition-all group-hover:opacity-100"
        :class="[activatedId === menu.id ? 'animate-none opacity-100' : '']"
      />
    </NuxtLink>
  </div>
</template>
