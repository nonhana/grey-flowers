<script setup lang="ts">
import type { MessageItem } from '~/types/message'

const props = defineProps<{
  needRefresh: boolean
}>()

const emits = defineEmits<{
  (e: 'refreshed'): void
}>()

const { needRefresh } = toRefs(props)

const messages = ref<MessageItem[]>([])

async function fetchMessages() {
  const data = await $fetch('/api/messages/list')

  if (data.success) {
    messages.value = data.payload ?? []
  }
}

watch(needRefresh, async (newV) => {
  if (newV) {
    await fetchMessages()
    emits('refreshed')
  }
})

onMounted(async () => {
  await fetchMessages()
})
</script>

<template>
  <div class="relative mb-5 flex w-full flex-col gap-5">
    <ThoughtsMessagesItem v-for="(message, index) in messages" :key="message.id" :index="index" :message="message" />
  </div>
</template>
