import { useArticleStore } from './modules/article'
import { useDialogStore } from './modules/dialog'
import { useHeaderStatusStore } from './modules/headerStatus'
import { useUIInfoStore } from './modules/uiInfo'
import { useUserInfoStore } from './modules/user'

export function useStore() {
  return {
    articleStore: useArticleStore(),
    dialogStore: useDialogStore(),
    headerStatusStore: useHeaderStatusStore(),
    uiInfoStore: useUIInfoStore(),
    userStore: useUserInfoStore(),
  }
}
