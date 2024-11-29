export const useHeaderStatusStore = defineStore('headerStatus', () => {
  const hidden = ref(false)
  const setHidden = (status: boolean) => {
    hidden.value = status
  }
  return {
    hidden,
    setHidden,
  }
})
