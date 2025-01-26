export const useDialogStore = defineStore('dialog', () => {
  const dialogCount = ref(0)

  function getDialogCount() {
    return dialogCount.value
  }

  function increaseDialogCount() {
    dialogCount.value += 1
  }

  function decreaseDialogCount() {
    dialogCount.value -= 1
  }

  return {
    dialogCount,
    getDialogCount,
    increaseDialogCount,
    decreaseDialogCount,
  }
})
