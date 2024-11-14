<script setup lang="ts">
import { useStore } from '~/store'

const { messagesStore } = useStore()
</script>

<template>
  <div class="relative mb-5 flex w-full flex-col gap-5">
    <ThoughtsMessagesItem v-for="message in messagesStore.messages" :key="message.id" :message="message" />
  </div>
</template>
