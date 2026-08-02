<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'
import type { DropdownCommand } from '#shared/types/common'
import { Globe, KeyRound, LogIn, LogOut, Mail, MessageSquareMore, User, UserPlus, UserRound } from '@lucide/vue'
import { useStore } from '~/stores'

const { userStore } = useStore()
const { callHanaMessage } = useMessage()
const { callHanaDialog } = useDialog()
const apiClient = useApiClient()

const { userInfo, loggedIn, loginWindowVisible, registerWindowVisible } = toRefs(userStore)

const isMe = computed(() => userInfo.value?.userId === hanaInfo.id)

interface UserMenuItem {
  text: string
  icon: LucideIcon
}

const notLoggedInMap: UserMenuItem[] = [{
  text: '登录',
  icon: LogIn,
}, {
  text: '注册',
  icon: UserPlus,
}]

const loggedInMap: UserMenuItem[] = [{
  text: '个人资料',
  icon: User,
}, {
  text: '消息',
  icon: Mail,
}, {
  text: '评论',
  icon: MessageSquareMore,
}, {
  text: '退出登录',
  icon: LogOut,
}]

const hanaMap: UserMenuItem[] = [{
  text: '个人资料',
  icon: User,
}, {
  text: '消息',
  icon: Mail,
}, {
  text: '评论',
  icon: MessageSquareMore,
}, {
  text: '退出登录',
  icon: LogOut,
}]

function toggleLoginRegisterWindow() {
  loginWindowVisible.value = !loginWindowVisible.value
  registerWindowVisible.value = !registerWindowVisible.value
}

const logging = ref(false)
const loginBtnText = computed(() => logging.value ? '登录中...' : '登录')
async function handleLogin(e: Event) {
  const formData = new FormData(e.target as HTMLFormElement)
  const account = formData.get('account')
  const password = formData.get('password')
  if (typeof account !== 'string' || typeof password !== 'string' || !account || !password) {
    callHanaMessage({
      message: '请输入用户名和密码。',
      type: 'error',
    })
    return
  }

  logging.value = true
  try {
    const data = await apiClient.login({ account, password })
    if (data.success) {
      loginWindowVisible.value = false
      callHanaMessage({
        message: `欢迎回来，${data.data.principal.username}。`,
        type: 'success',
      })
    }
    else {
      callHanaMessage({
        message: data.error.message || '登录失败。',
        type: 'error',
      })
    }
  }
  catch {
    callHanaMessage({
      message: '网络连接失败，请稍后重试。',
      type: 'error',
    })
  }
  finally {
    logging.value = false
  }
}

const registering = ref(false)
const registerBtnText = computed(() => registering.value ? '注册中...' : '注册')
async function handleRegister(e: Event) {
  const formData = new FormData(e.target as HTMLFormElement)
  const username = formData.get('username')
  const email = formData.get('email')
  const password = formData.get('password')
  const site = formData.get('site')
  if (
    typeof username !== 'string'
    || typeof email !== 'string'
    || typeof password !== 'string'
    || !username
    || !email
    || !password
  ) {
    callHanaMessage({
      message: '请填写用户名、邮箱和密码。',
      type: 'error',
    })
    return
  }

  registering.value = true
  try {
    const data = await apiClient.register({
      username,
      email,
      password,
      ...(typeof site === 'string' && site ? { site } : {}),
    })
    if (data.success) {
      callHanaMessage({
        message: '注册成功，请登录',
        type: 'success',
      })
      registerWindowVisible.value = false
      loginWindowVisible.value = true
    }
    else {
      callHanaMessage({
        message: data.error.message || '注册失败。',
        type: 'error',
      })
    }
  }
  catch {
    callHanaMessage({
      message: '网络连接失败，请稍后重试。',
      type: 'error',
    })
  }
  finally {
    registering.value = false
  }
}

async function handleSubmit(type: 'login' | 'register', e: Event) {
  switch (type) {
    case 'login':
      await handleLogin(e)
      break
    case 'register':
      await handleRegister(e)
      break
  }
}

const userInfoDialogVisible = ref(false)
const messagesDialogVisible = ref(false)
const commentsDialogVisible = ref(false)

function handleUserCommand(command: DropdownCommand) {
  switch (command) {
    case '登录':
      loginWindowVisible.value = true
      break
    case '注册':
      registerWindowVisible.value = true
      break
    case '个人资料':
      userInfoDialogVisible.value = true
      break
    case '消息':
      messagesDialogVisible.value = true
      break
    case '评论':
      commentsDialogVisible.value = true
      break
    case '退出登录':
      callHanaDialog({
        title: '提示',
        content: '确定要退出登录吗？',
        showCancelButton: true,
        onOk: async () => {
          try {
            const data = await apiClient.logout()
            callHanaMessage({
              message: data.success ? '已退出登录。' : data.error.message,
              type: data.success ? 'success' : 'error',
            })
          }
          catch {
            callHanaMessage({
              message: '本地登录状态已清除，服务端退出未确认。',
              type: 'error',
            })
          }
        },
      })
      break
  }
}
</script>

<template>
  <!-- 由于 pinia store 数组存储至 localStorage，因此必须客户端渲染 -->
  <ClientOnly v-if="!loggedIn">
    <HanaDropdown animation="slide" offset="end" :show-arrow="false" @command="handleUserCommand">
      <HanaButton
        icon-button
        :icon="UserRound"
        aria-label="打开用户菜单"
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
  </ClientOnly>
  <ClientOnly v-else>
    <HanaDropdown animation="slide" offset="end" :show-arrow="false" @command="handleUserCommand">
      <HanaAvatar :size="8" :avatar="userInfo!.avatar" :username="userInfo!.username" :site="userInfo!.site" :show-info="false" />
      <template #dropdown>
        <HanaDropdownMenu>
          <HanaDropdownItem
            v-for="item in (isMe ? hanaMap : loggedInMap)"
            :key="item.text"
            :icon="item.icon"
            :command="item.text"
          >
            {{ item.text }}
          </HanaDropdownItem>
        </HanaDropdownMenu>
      </template>
    </HanaDropdown>
  </ClientOnly>
  <HanaDialog v-model="loginWindowVisible" title="欢迎来到...花园。">
    <form @submit.prevent="(e) => handleSubmit('login', e)">
      <div class="flex flex-col gap-4">
        <HanaInput name="account" :prefix-icon="UserRound" shape="rounded" placeholder="用户名 / 邮箱" />
        <HanaInput name="password" :prefix-icon="KeyRound" shape="rounded" type="password" placeholder="密码" />
      </div>
      <div class="mt-8 flex flex-col gap-4">
        <HanaButton class="w-full" dark-mode type="submit" :disabled="logging">
          {{ loginBtnText }}
        </HanaButton>
        <HanaButton class="w-full" @click="toggleLoginRegisterWindow">
          <span class="text-hana-blue dark:text-hana-blue-200">创建账户</span>
        </HanaButton>
      </div>
    </form>
  </HanaDialog>
  <HanaDialog v-model="registerWindowVisible" title="这里有你想找的花吗？">
    <form @submit.prevent="(e) => handleSubmit('register', e)">
      <div class="flex flex-col gap-4">
        <HanaInput name="username" :prefix-icon="UserRound" shape="rounded" placeholder="用户名" />
        <HanaInput name="email" :prefix-icon="Mail" shape="rounded" placeholder="邮箱" />
        <HanaInput name="site" :prefix-icon="Globe" shape="rounded" placeholder="站点（无可不填）" />
        <HanaInput name="password" :prefix-icon="KeyRound" shape="rounded" type="password" placeholder="密码" />
      </div>
      <div class="mt-8 flex flex-col gap-4">
        <HanaButton class="w-full" dark-mode type="submit" :disabled="registering">
          {{ registerBtnText }}
        </HanaButton>
        <HanaButton class="w-full" @click="toggleLoginRegisterWindow">
          <span class="text-hana-blue dark:text-hana-blue-200">已有帐号</span>
        </HanaButton>
      </div>
    </form>
  </HanaDialog>
  <ClientOnly>
    <UserInfoDialog v-if="loggedIn" v-model="userInfoDialogVisible" />
  </ClientOnly>
  <ClientOnly>
    <UserMessagesDialog v-if="loggedIn" v-model="messagesDialogVisible" />
  </ClientOnly>
  <ClientOnly>
    <UserCommentsDialog v-if="loggedIn" v-model="commentsDialogVisible" />
  </ClientOnly>
</template>
