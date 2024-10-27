<script setup lang="ts">
interface SideMenuProps {
  menus: {
    id: number
    title: string
    icon: string
    to: string
  }[]
  activatedId: number
  type?: 'horizontal' | 'vertical'
}

withDefaults(defineProps<SideMenuProps>(), {
  type: 'vertical',
})
</script>

<template>
  <div
    class="relative flex size-fit shrink-0 overflow-auto rounded-lg bg-white p-2 text-text shadow-md"
    :class="[type === 'horizontal' ? 'mx-auto flex-row gap-2 md:gap-4' : 'flex-col gap-2']"
  >
    <NuxtLink
      v-for="menu in menus" :key="menu.id"
      :to="menu.to"
      class="group hana-button text-base md:text-xl"
      :class="[
        activatedId === menu.id ? 'bg-hana-blue-200/40 text-hana-blue' : '',
        type === 'horizontal' ? 'w-auto' : 'w-36',
      ]"
    >
      <div class="flex items-center gap-2">
        <Icon :name="menu.icon" />
        <span>{{ menu.title }}</span>
      </div>
      <Icon
        v-if="type === 'vertical'"
        name="lucide:arrow-right" class="animate-bounce-x opacity-0 transition-all group-hover:opacity-100"
        :class="[activatedId === menu.id ? 'animate-none opacity-100' : '']"
      />
    </NuxtLink>
  </div>
</template>
