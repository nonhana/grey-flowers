import { useMessagesStore } from './modules/messages'
import { useUserInfoStore } from './modules/user'

export function useStore() {
  return {
    messagesStore: useMessagesStore(),
    userStore: useUserInfoStore(),
  }
}
