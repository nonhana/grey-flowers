import { useArticleStore } from './modules/article'
import { useDialogStore } from './modules/dialog'
import { useGlobalScrollStore } from './modules/globalScroll'
import { useHeaderStatusStore } from './modules/headerStatus'
import { useUserInfoStore } from './modules/user'

export function useStore() {
  return {
    articleStore: useArticleStore(),
    dialogStore: useDialogStore(),
    globalScrollStore: useGlobalScrollStore(),
    headerStatusStore: useHeaderStatusStore(),
    userStore: useUserInfoStore(),
  }
}
