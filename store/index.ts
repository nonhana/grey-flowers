import { useArticleHeadStatusStore } from './modules/articleHeadStatus'
import { useDialogStore } from './modules/dialog'
import { useHeaderStatusStore } from './modules/headerStatus'
import { useLayoutScrollStore } from './modules/layoutScroll'
import { useUserInfoStore } from './modules/user'

export function useStore() {
  return {
    articleHeadStatusStore: useArticleHeadStatusStore(),
    dialogStore: useDialogStore(),
    headerStatusStore: useHeaderStatusStore(),
    layoutScrollStore: useLayoutScrollStore(),
    userStore: useUserInfoStore(),
  }
}
