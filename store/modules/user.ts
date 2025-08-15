import type { JwtPayload } from '~/server/types/jwt'

export const useUserInfoStore = defineStore('userInfo', () => {
  const loginWindowVisible = ref(false)
  const registerWindowVisible = ref(false)
  const activityWindowVisible = ref(false)

  const userInfo = ref<JwtPayload>()
  const loggedIn = computed(() => !!userInfo.value)

  function toggleLoginWindow(status?: boolean) {
    loginWindowVisible.value = status ?? !loginWindowVisible.value
  }

  function toggleRegisterWindow(status?: boolean) {
    registerWindowVisible.value = status ?? !registerWindowVisible.value
  }

  function toggleActivityWindow(status?: boolean) {
    activityWindowVisible.value = status ?? !activityWindowVisible.value
  }

  function setUserInfo(info: JwtPayload) {
    userInfo.value = info
  }

  function logout() {
    userInfo.value = undefined
  }

  return {
    loginWindowVisible,
    registerWindowVisible,
    activityWindowVisible,
    userInfo,
    loggedIn,
    toggleLoginWindow,
    toggleRegisterWindow,
    toggleActivityWindow,
    setUserInfo,
    logout,
  }
}, {
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
    pick: ['userInfo'],
  },
})
