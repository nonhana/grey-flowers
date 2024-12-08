export const useArticleHeadStatusStore = defineStore('articleHeadStatus', () => {
  const visible = ref(false)
  const setVisible = (status: boolean) => {
    visible.value = status
  }
  return {
    visible,
    setVisible,
  }
})
