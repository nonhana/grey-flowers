<script setup lang="ts">
import type { SimpleUserInfo } from '~/types/userInfo'

defineProps<{
  userInfo: SimpleUserInfo | null
}>()

const visible = defineModel<boolean>()
</script>

<template>
  <HanaDialog v-model="visible" width="300px">
    <div class="relative -top-5 flex flex-col items-center gap-2">
      <NuxtImg v-if="userInfo!.avatar" :src="userInfo!.avatar" width="64" height="64" class="rounded-full" />
      <div v-else class="flex size-16 items-center justify-center rounded-full bg-hana-blue text-3xl text-white">
        <span>{{ userInfo!.username[0] }}</span>
      </div>
      <span class="text-xl font-bold">{{ userInfo!.username }}</span>
      <NuxtLink
        v-if="userInfo!.site"
        :to="userInfo!.site"
        target="_blank"
        class="text-hana-blue with-underline after:mx-1 after:font-mono after:opacity-50 after:content-['↗']"
      >
        {{ userInfo!.site }}
      </NuxtLink>
    </div>
  </HanaDialog>
</template>
