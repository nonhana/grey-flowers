import { useArticleHeadStatusStore } from './modules/articleHeadStatus'
import { useHeaderStatusStore } from './modules/headerStatus'
import { useUserInfoStore } from './modules/user'

export function useStore() {
  return {
    userStore: useUserInfoStore(),
    headerStatusStore: useHeaderStatusStore(),
    articleHeadStatusStore: useArticleHeadStatusStore(),
  }
}
