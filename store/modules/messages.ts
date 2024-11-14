import type { MessageItem } from '~/types/message'

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref<MessageItem[]>(MessageMockList)

  function addMessage(message: MessageItem) {
    messages.value.push(message)
  }

  return {
    messages,
    addMessage,
  }
})
