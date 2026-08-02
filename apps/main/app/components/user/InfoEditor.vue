<script setup lang="ts">
import type { AuthUpdateMeInput } from '@grey-flowers/contracts'
import { Globe, KeyRound, Mail, UserRound } from '@lucide/vue'
import { useStore } from '~/stores'

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)

const userInfoForm = ref({
  username: userInfo.value?.username ?? '',
  email: userInfo.value?.email ?? '',
  site: userInfo.value?.site ?? '',
  currentPassword: '',
  newPassword: '',
})

const edited = computed(() => {
  const { username, email, site, currentPassword, newPassword } = userInfoForm.value
  return username !== userInfo.value?.username
    || email !== userInfo.value?.email
    || site !== (userInfo.value?.site ?? '')
    || currentPassword !== ''
    || newPassword !== ''
})

const { callHanaMessage } = useMessage()
const apiClient = useApiClient()

const visible = defineModel<boolean>()

const submitting = ref(false)

const submitBtnText = computed(() => submitting.value ? '提交中...' : '确认')

function handleForm(): AuthUpdateMeInput | undefined {
  const { username, email, site, currentPassword, newPassword } = userInfoForm.value
  if (!username || !email) {
    callHanaMessage({
      message: '请填写用户名与邮箱。',
      type: 'error',
    })
    return
  }
  if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
    callHanaMessage({
      message: '修改密码时请同时填写当前密码和新密码。',
      type: 'error',
    })
    return
  }

  const result: AuthUpdateMeInput = {}
  if (username !== userInfo.value!.username)
    result.username = username
  if (email !== userInfo.value!.email)
    result.email = email

  const normalizedSite = site || null
  if (normalizedSite !== userInfo.value!.site)
    result.site = normalizedSite

  if (currentPassword && newPassword) {
    result.currentPassword = currentPassword
    result.newPassword = newPassword
  }

  return result
}

async function submitForm(objData: AuthUpdateMeInput) {
  submitting.value = true
  try {
    const data = await apiClient.updateMe(objData)
    if (!data.success) {
      callHanaMessage({
        message: data.error.message || '修改失败。',
        type: 'error',
      })
      return
    }

    if (data.data.requiresReauthentication) {
      apiClient.clearSession()
      visible.value = false
      callHanaMessage({
        message: '密码已修改，请重新登录。',
        type: 'success',
      })
      return
    }

    callHanaMessage({
      message: '修改成功',
      type: 'success',
    })
    userStore.setUserInfo(data.data.principal)
    visible.value = false
  }
  catch {
    callHanaMessage({
      message: '网络连接失败，请稍后重试。',
      type: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function handleSubmit() {
  const formattedData = handleForm()
  if (formattedData) {
    await submitForm(formattedData)
  }
}
</script>

<template>
  <HanaDialog v-model="visible" title="修改信息">
    <form @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-4">
        <HanaInput v-model="userInfoForm.username" name="username" :prefix-icon="UserRound" shape="rounded" placeholder="用户名" />
        <HanaInput v-model="userInfoForm.email" name="email" :prefix-icon="Mail" shape="rounded" placeholder="邮箱" />
        <HanaInput v-model="userInfoForm.site" name="site" :prefix-icon="Globe" shape="rounded" placeholder="站点（无可不填）" />
        <HanaInput v-model="userInfoForm.currentPassword" name="currentPassword" :prefix-icon="KeyRound" shape="rounded" type="password" placeholder="当前密码（仅修改密码时填写）" />
        <HanaInput v-model="userInfoForm.newPassword" name="newPassword" :prefix-icon="KeyRound" shape="rounded" type="password" placeholder="新密码（仅修改密码时填写）" />
      </div>
      <div class="mt-8 flex gap-4">
        <HanaButton class="flex-1" @click="visible = false">
          取消
        </HanaButton>
        <HanaButton class="flex-1" dark-mode type="submit" :disabled="!edited || submitting">
          {{ submitBtnText }}
        </HanaButton>
      </div>
    </form>
  </HanaDialog>
</template>
