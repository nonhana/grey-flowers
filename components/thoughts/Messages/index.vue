<script setup lang="ts">
import { useStore } from '~/store'

const { messagesStore } = useStore()
const { messages, newMessages } = messagesStore
</script>

<template>
  <div class="relative mb-5 flex w-full flex-col gap-5">
    <ThoughtsMessagesItem v-for="(message, index) in messages" :key="message.id" :index="index" :message="message" />
    <ThoughtsMessagesItem v-for="message in newMessages" :key="message.id" :index="0" :message="message" />
  </div>
</template>
