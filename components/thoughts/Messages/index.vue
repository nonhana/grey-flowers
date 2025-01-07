<script setup lang="ts">
import type { MessageItem } from '~/types/message'

const props = defineProps<{
  newMsgId: number | undefined
}>()

const emits = defineEmits<{
  (e: 'refreshed'): void
}>()

const msgContainerRef = ref<HTMLDivElement | null>(null)

const { newMsgId } = toRefs(props)

const messages = ref<MessageItem[]>([])

async function fetchOldMessages() {
  const data = await $fetch('/api/messages/list')
  if (data.success) {
    messages.value = data.payload!
    setTimeout(() => {
      scrollToBottom()
    }, 100 + Math.floor(messages.value.length / 2) * 100)
  }
}

onMounted(fetchOldMessages)

async function fetchNewMessage(id: number) {
  const data = await $fetch('/api/messages/single', { query: { id } })
  if (data.success) {
    messages.value.push({ ...data.payload!, isNew: true })
    await scrollToBottom()
  }
}

async function scrollToBottom() {
  if (msgContainerRef.value) {
    await nextTick()
    msgContainerRef.value.scrollTo({
      top: msgContainerRef.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

watch(newMsgId, async (newV) => {
  if (newV) {
    await fetchNewMessage(newV)
    emits('refreshed')
  }
})
</script>

<template>
  <div ref="msgContainerRef" class="mb-5 flex h-[calc(100dvh-22rem)] w-full flex-col gap-5 overflow-auto scrollbar-hidden">
    <ThoughtsMessagesItem v-for="(message, index) in messages" :key="message.id" :index="message.isNew ? 0 : index" :message="message" />
  </div>
</template>
