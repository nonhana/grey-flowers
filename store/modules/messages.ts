import type { MessageItem } from '~/types/message'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<MessageItem[]>(MessageMockList)
  const newMessages = ref<MessageItem[]>([])

  function addMessage(message: MessageItem) {
    newMessages.value.push(message)
  }

  return {
    messages,
    newMessages,
    addMessage,
  }
})
