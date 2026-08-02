import type { Principal } from '@grey-flowers/contracts'

export const useUserInfoStore = defineStore('userInfo', () => {
  const loginWindowVisible = ref(false)
  const registerWindowVisible = ref(false)

  const userInfo = ref<Principal>()
  const loggedIn = computed(() => !!userInfo.value)

  function toggleLoginWindow(status?: boolean) {
    loginWindowVisible.value = status ?? !loginWindowVisible.value
  }

  function toggleRegisterWindow(status?: boolean) {
    registerWindowVisible.value = status ?? !registerWindowVisible.value
  }

  function setUserInfo(info: Principal) {
    userInfo.value = info
  }

  function logout() {
    userInfo.value = undefined
  }

  return {
    loginWindowVisible,
    registerWindowVisible,
    userInfo,
    loggedIn,
    toggleLoginWindow,
    toggleRegisterWindow,
    setUserInfo,
    logout,
  }
})
