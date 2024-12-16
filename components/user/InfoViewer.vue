<script setup lang="ts">
defineProps<{
  avatar: string | null
  username: string
  site: string | null
}>()

const visible = defineModel<boolean>()
</script>

<template>
  <HanaDialog v-model="visible" width="300px">
    <div class="relative -top-5 flex flex-col items-center gap-4">
      <NuxtImg v-if="avatar" :src="avatar" class="size-20 rounded-full" />
      <div v-else class="flex size-20 shrink-0 select-none items-center justify-center rounded-full bg-hana-blue text-2xl text-white">
        <span>{{ username[0] }}</span>
      </div>
      <span class="text-xl font-bold">{{ username }}</span>
      <NuxtLink
        v-if="site"
        :to="site"
        :aria-label="`${username}的个人主页：${site}`"
        target="_blank"
        class="text-hana-blue with-underline after:mx-1 after:font-mono after:opacity-50 after:content-['↗']"
      >
        {{ site }}
      </NuxtLink>
    </div>
  </HanaDialog>
</template>
