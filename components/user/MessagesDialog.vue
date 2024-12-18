<script setup lang="ts">
import type { CommentItem } from '~/types/comment'
import { useStore } from '~/store'

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)

const visible = defineModel<boolean>()

const messages = ref<CommentItem[]>([])

async function fetchUserMessages() {
  const data = await $fetch('/api/user/messages', { query: { id: userInfo.value!.id } })
  if (data.success) {
    messages.value = data.payload ?? []
  }
}

onMounted(fetchUserMessages)
</script>

<template>
  <HanaDialog v-model="visible" title="你最近收到的消息" width="800px">
    <div class="px-4">
      <UserMessageItem v-for="message in messages" :key="message.id" :message="message" />
    </div>
  </HanaDialog>
</template>
