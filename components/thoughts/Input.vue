<script setup lang="ts">
import { useStore } from '~/store'
import type { MessageItem } from '~/types/message'

const { messagesStore } = useStore()

const value = ref('')

function handlePublish() {
  const messageItem: MessageItem = {
    id: messagesStore.messages.length + 1,
    content: value.value,
    author: {
      id: 1,
      name: 'Hana',
      site: '/about',
      avatar: '/images/avatar.webp',
    },
    publishedAt: new Date().toLocaleString(),
    editedAt: '',
    isMe: true,
  }
  messagesStore.addMessage(messageItem)
}
</script>

<template>
  <div class="w-full">
    <HanaInput v-model="value" type="textarea" resize="none" placeholder="有什么想说的呢~" />
    <div class="hana-card my-5 flex items-center justify-end">
      <HanaButton :disabled="value === ''" icon="material-symbols:send-outline" @click="handlePublish">
        发布
      </HanaButton>
    </div>
  </div>
</template>
