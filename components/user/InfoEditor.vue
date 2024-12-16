<script setup lang="ts">
import { useStore } from '~/store'

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)

const userInfoForm = ref({
  username: userInfo.value?.username ?? '',
  email: userInfo.value?.email ?? '',
  site: userInfo.value?.site ?? '',
  password: '',
})

const edited = computed(() => {
  const { username, email, site, password } = userInfoForm.value
  return username !== userInfo.value?.username
    || email !== userInfo.value?.email
    || site !== (userInfo.value?.site ?? '')
    || password !== ''
})

const { callHanaMessage } = useMessage()

const visible = defineModel<boolean>()

const submitting = ref(false)

const submitBtnText = computed(() => submitting.value ? '提交中...' : '确认')

function handleForm() {
  const objData: Record<string, string | null> = { ...userInfoForm.value, id: String(userInfo.value!.id) }
  if (!objData.username || !objData.email) {
    callHanaMessage({
      message: '请填写用户名与邮箱。',
      type: 'error',
    })
    return
  }
  if (objData.username === userInfo.value!.username) {
    delete objData.username
  }
  if (objData.email === userInfo.value!.email) {
    delete objData.email
  }
  if (objData.site === '') {
    objData.site = null
  }
  if (objData.site === userInfo.value!.site) {
    delete objData.site
  }
  if (objData.password === '') {
    delete objData.password
  }
  return objData
}

async function submitForm(objData: Record<string, string | null>) {
  submitting.value = true
  const { data } = await useFetch('/api/user/edit', { method: 'POST', body: JSON.stringify(objData) })
  if (data.value?.success) {
    callHanaMessage({
      message: '修改成功',
      type: 'success',
    })
    userStore.setUserInfo(data.value.payload!)
    visible.value = false
  }
  else {
    const errorList = data.value?.error?.map(item => item.message).join(', ')
    callHanaMessage({
      message: errorList || '修改失败。',
      type: 'error',
    })
  }
  submitting.value = false
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
        <HanaInput v-model="userInfoForm.username" name="username" prefix-icon="lucide:user-round" shape="rounded" placeholder="用户名" />
        <HanaInput v-model="userInfoForm.email" name="email" prefix-icon="lucide:mail" shape="rounded" placeholder="邮箱" />
        <HanaInput v-model="userInfoForm.site" name="site" prefix-icon="lucide:globe" shape="rounded" placeholder="站点（无可不填）" />
        <HanaInput v-model="userInfoForm.password" name="password" prefix-icon="lucide:key-round" shape="rounded" type="password" placeholder="新密码" />
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
