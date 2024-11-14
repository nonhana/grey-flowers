import { useMessagesStore } from './modules/messages'

export function useStore() {
  return {
    messagesStore: useMessagesStore(),
  }
}
