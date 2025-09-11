<script setup lang="ts">
import type { CommentItem } from '~/types/comment'
import { useStore } from '~/store'

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)

const visible = defineModel<boolean>()

const messages = ref<CommentItem[]>([])

const fetching = ref(false)

async function fetchUserMessages() {
  fetching.value = true
  const data = await $fetch('/api/user/messages', { query: { id: userInfo.value!.id } })
  if (data.success) {
    messages.value = (data.payload as CommentItem[]) ?? []
  }
  fetching.value = false
}

onMounted(fetchUserMessages)
</script>

<template>
  <HanaDialog v-model="visible" title="最近 10 条消息" width="800px">
    <div class="px-4">
      <UserMessageItem v-for="message in messages" :key="message.id" :message="message" />
      <div v-if="!fetching && !messages.length" class="w-full flex flex-col items-center justify-center gap-4 text-xl">
        <NuxtImg src="/images/empty.webp" alt="空空如也" class="size-40 rounded-lg" />
        <span>空空如也...</span>
      </div>
    </div>
  </HanaDialog>
</template>
