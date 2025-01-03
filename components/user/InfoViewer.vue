<script setup lang="ts">
defineProps<{
  avatar: string
  username: string
  site: string | null
}>()

const visible = defineModel<boolean>()
</script>

<template>
  <HanaDialog v-model="visible" width="300px">
    <div class="relative mb-5 flex flex-col items-center gap-4">
      <NuxtImg :src="avatar" class="size-20 rounded-full" />
      <span class="text-xl font-bold dark:text-hana-white">{{ username }}</span>
      <NuxtLink
        v-if="site"
        :to="site"
        :aria-label="`${username}的个人主页：${site}`"
        target="_blank"
        class="text-hana-blue with-underline after:mx-1 after:font-mono after:opacity-50 after:content-['↗'] dark:text-hana-blue-200"
      >
        {{ site }}
      </NuxtLink>
    </div>
  </HanaDialog>
</template>
