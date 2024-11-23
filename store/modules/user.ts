import type { JwtPayload } from '~/server/types/jwt'

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfo = ref<JwtPayload>()
  const loggedIn = computed(() => !!userInfo.value)

  function setUserInfo(info: JwtPayload) {
    userInfo.value = info
  }

  function logout() {
    userInfo.value = undefined
  }

  return {
    userInfo,
    loggedIn,
    setUserInfo,
    logout,
  }
}, { persist: true })
