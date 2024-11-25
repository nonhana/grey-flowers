<script setup lang="ts">
import useDialog from '~/components/hana/Dialog/useDialog'
import useMessage from '~/components/hana/Message/useMessage'
import { useStore } from '~/store'

const { t } = useI18n()
const { userStore } = useStore()
const { callHanaMessage } = useMessage()
const { callHanaDialog } = useDialog()

const notLoggedInMap = [{
  text: t('header.user.notLoggedIn.login'),
  icon: 'lucide:log-in',
}, {
  text: t('header.user.notLoggedIn.register'),
  icon: 'lucide:user-plus',
}]

const loggedInMap = [{
  text: t('header.user.loggedIn.profile'),
  icon: 'lucide:user',
}, {
  text: t('header.user.loggedIn.messages'),
  icon: 'lucide:mail',
}, {
  text: t('header.user.loggedIn.comments'),
  icon: 'lucide:message-square-more',
}, {
  text: t('header.user.loggedIn.logout'),
  icon: 'lucide:log-out',
}]

const loginWindowVisible = ref(false)
const registerWindowVisible = ref(false)

function toggleLoginRegisterWindow() {
  loginWindowVisible.value = !loginWindowVisible.value
  registerWindowVisible.value = !registerWindowVisible.value
}

function handleUserCommand(command: string | number | object) {
  switch (command) {
    case t('header.user.notLoggedIn.login'):
      loginWindowVisible.value = true
      break
    case t('header.user.notLoggedIn.register'):
      registerWindowVisible.value = true
      break
    case t('header.user.loggedIn.logout'):
      callHanaDialog({
        title: '提示',
        content: '确定要退出登录吗？',
        showCancelButton: true,
        onOk: () => {
          localStorage.removeItem('token')
          userStore.logout()
          callHanaMessage({
            message: '已退出登录。',
            type: 'success',
          })
        },
      })
      break
    default:
      callHanaMessage({
        message: '功能开发中...',
        type: 'error',
      })
      break
  }
}

async function handleLogin(e: Event) {
  if (e.target) {
    const formData = new FormData(e.target as HTMLFormElement)
    const objData = Object.fromEntries(formData)
    if (!objData.account || !objData.password) {
      callHanaMessage({
        message: '请输入用户名和密码。',
        type: 'error',
      })
      return
    }
    const { data } = await useFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(objData) })
    if (data.value?.success) {
      localStorage.setItem('token', data.value.payload!.token)
      userStore.setUserInfo(data.value.payload!.userInfo)
      loginWindowVisible.value = false
      callHanaMessage({
        message: `欢迎回来，${userStore.userInfo?.username}。`,
        type: 'success',
      })
    }
    else {
      callHanaMessage({
        message: data.value?.statusMessage || '登录失败。',
        type: 'error',
      })
    }
  }
}

async function handleRegister(e: Event) {
  if (e.target) {
    const formData = new FormData(e.target as HTMLFormElement)
    const objData = Object.fromEntries(formData)
    if (!objData.username || !objData.email || !objData.password) {
      callHanaMessage({
        message: '请填写用户名、邮箱和密码。',
        type: 'error',
      })
      return
    }
    const { data } = await useFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(objData) })
    if (data.value?.success) {
      loginWindowVisible.value = true
    }
    else {
      const errorList = data.value?.payload?.map(item => item.message).join(', ')
      callHanaMessage({
        message: errorList || '注册失败。',
        type: 'error',
      })
    }
  }
}

async function handleSubmit(type: 'login' | 'register', e: Event) {
  switch (type) {
    case 'login':
      handleLogin(e)
      break
    case 'register':
      handleRegister(e)
      break
  }
}
</script>

<template>
  <HanaDropdown v-if="!userStore.loggedIn" animation="slide" offset="end" :show-arrow="false" @command="handleUserCommand">
    <HanaButton
      icon-button
      icon="lucide:user-round"
      class="ml-auto"
    />
    <template #dropdown>
      <HanaDropdownMenu>
        <HanaDropdownItem
          v-for="item in notLoggedInMap"
          :key="item.text"
          :icon="item.icon"
          :command="item.text"
        >
          {{ item.text }}
        </HanaDropdownItem>
      </HanaDropdownMenu>
    </template>
  </HanaDropdown>
  <HanaDropdown v-if="userStore.loggedIn" animation="slide" offset="end" :show-arrow="false" @command="handleUserCommand">
    <NuxtImg v-if="userStore.userInfo!.avatar" :src="userStore.userInfo!.avatar" class="size-8 cursor-pointer rounded-full" />
    <div v-else class="flex size-8 cursor-pointer items-center justify-center rounded-full bg-hana-blue text-xl text-white">
      <span>{{ userStore.userInfo!.username[0] }}</span>
    </div>
    <template #dropdown>
      <HanaDropdownMenu>
        <HanaDropdownItem
          v-for="item in loggedInMap"
          :key="item.text"
          :icon="item.icon"
          :command="item.text"
        >
          {{ item.text }}
        </HanaDropdownItem>
      </HanaDropdownMenu>
    </template>
  </HanaDropdown>
  <HanaDialog v-model="loginWindowVisible" title="欢迎来到...花园。">
    <form @submit.prevent="(e) => handleSubmit('login', e)">
      <div class="flex flex-col gap-4">
        <HanaInput name="account" prefix-icon="lucide:user-round" shape="rounded" placeholder="用户名 / 邮箱" />
        <HanaInput name="password" prefix-icon="lucide:key-round" shape="rounded" type="password" placeholder="密码" />
      </div>
      <div class="mt-8 flex flex-col gap-4">
        <HanaButton class="w-full" dark-mode type="submit">
          <span>登录</span>
        </HanaButton>
        <HanaButton class="w-full" @click="toggleLoginRegisterWindow">
          <span class="text-hana-blue">创建账户</span>
        </HanaButton>
      </div>
    </form>
  </HanaDialog>
  <HanaDialog v-model="registerWindowVisible" title="这里有你想找的花吗？">
    <form @submit.prevent="(e) => handleSubmit('register', e)">
      <div class="flex flex-col gap-4">
        <HanaInput name="username" prefix-icon="lucide:user-round" shape="rounded" placeholder="用户名" />
        <HanaInput name="email" prefix-icon="lucide:mail" shape="rounded" placeholder="邮箱" />
        <HanaInput name="site" prefix-icon="lucide:globe" shape="rounded" placeholder="站点（无可不填）" />
        <HanaInput name="password" prefix-icon="lucide:key-round" shape="rounded" type="password" placeholder="密码" />
      </div>
      <div class="mt-8 flex flex-col gap-4">
        <HanaButton class="w-full" dark-mode type="submit">
          <span>注册</span>
        </HanaButton>
        <HanaButton class="w-full" @click="toggleLoginRegisterWindow">
          <span class="text-hana-blue">已有帐号</span>
        </HanaButton>
      </div>
    </form>
  </HanaDialog>
</template>
