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
      <HanaAvatar :size="16" :avatar="userInfo!.avatar" :username="userInfo!.username" />
      <span class="text-xl font-bold">{{ userInfo!.username }}</span>
      <NuxtLink
        v-if="userInfo!.site"
        :to="userInfo!.site"
        :aria-label="`${userInfo!.username}的个人主页：${userInfo!.site}`"
        target="_blank"
        class="text-hana-blue with-underline after:mx-1 after:font-mono after:opacity-50 after:content-['↗']"
      >
        {{ userInfo!.site }}
      </NuxtLink>
    </div>
  </HanaDialog>
</template>
