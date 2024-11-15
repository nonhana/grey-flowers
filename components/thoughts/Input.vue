<script setup lang="ts">
import { useStore } from '~/store'
import type { MessageItem } from '~/types/message'

const { messagesStore } = useStore()
const { newMessages } = messagesStore

const value = ref('')

function handlePublish() {
  if (value.value === '')
    return
  const messageItem: MessageItem = {
    id: newMessages.length + 1,
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
  value.value = ''
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handlePublish()
  }
}
</script>

<template>
  <div class="w-full">
    <HanaInput v-model="value" type="textarea" resize="none" placeholder="有什么想说的呢~" @keydown="handleKeyDown" />
    <div class="flex items-center justify-end">
      <div class="hana-card my-5 inline-block">
        <HanaButton :disabled="value === ''" icon="material-symbols:send-outline" @click="handlePublish">
          发布 / Enter
        </HanaButton>
      </div>
    </div>
  </div>
</template>
