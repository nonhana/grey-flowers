import { useArticleHeadStatusStore } from './modules/articleHeadStatus'
import { useDialogStore } from './modules/dialog'
import { useHeaderStatusStore } from './modules/headerStatus'
import { useUserInfoStore } from './modules/user'

export function useStore() {
  return {
    articleHeadStatusStore: useArticleHeadStatusStore(),
    dialogStore: useDialogStore(),
    headerStatusStore: useHeaderStatusStore(),
    userStore: useUserInfoStore(),
  }
}
