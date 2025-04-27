<script setup lang="ts">
import { useStore } from '~/store'

const { userStore } = useStore()
const { callHanaMessage } = useMessage()
const { callHanaDialog } = useDialog()

const { userInfo, loggedIn, loginWindowVisible, registerWindowVisible, activityWindowVisible } = toRefs(userStore)

// 如果用户已经登录，检查 token 是否过期
async function checkUserStatus() {
  if (loggedIn.value) {
    const data = await $fetch('/api/user/check-status', { method: 'GET' })
    if (!data.success) {
      userStore.logout()
    }
  }
}

onMounted(checkUserStatus)

const isMe = computed(() => userInfo.value?.id === hanaInfo.id)

const notLoggedInMap = [{
  text: '登录',
  icon: 'lucide:log-in',
}, {
  text: '注册',
  icon: 'lucide:user-plus',
}]

const loggedInMap = [{
  text: '个人资料',
  icon: 'lucide:user',
}, {
  text: '消息',
  icon: 'lucide:mail',
}, {
  text: '评论',
  icon: 'lucide:message-square-more',
}, {
  text: '退出登录',
  icon: 'lucide:log-out',
}]

const hanaMap = [{
  text: '个人资料',
  icon: 'lucide:user',
}, {
  text: '消息',
  icon: 'lucide:mail',
}, {
  text: '评论',
  icon: 'lucide:message-square-more',
}, {
  text: '发布动态',
  icon: 'lucide:notebook',
}, {
  text: '退出登录',
  icon: 'lucide:log-out',
}]

function toggleLoginRegisterWindow() {
  loginWindowVisible.value = !loginWindowVisible.value
  registerWindowVisible.value = !registerWindowVisible.value
}

const logging = ref(false)
const loginBtnText = computed(() => logging.value ? '登录中...' : '登录')
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
    logging.value = true
    const data = await $fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(objData) })
    if (data.success) {
      localStorage.setItem('token', data.payload!.token)
      userStore.setUserInfo(data.payload!.userInfo)
      loginWindowVisible.value = false
      callHanaMessage({
        message: `欢迎回来，${userInfo.value?.username}。`,
        type: 'success',
      })
    }
    else {
      callHanaMessage({
        message: data.statusMessage || '登录失败。',
        type: 'error',
      })
    }
    logging.value = false
  }
}

const registering = ref(false)
const registerBtnText = computed(() => registering.value ? '注册中...' : '注册')
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
    if (objData.site === '') {
      delete objData.site
    }
    registering.value = true
    const data = await $fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(objData) })
    if (data.success) {
      callHanaMessage({
        message: '注册成功，请登录',
        type: 'success',
      })
      registerWindowVisible.value = false
      loginWindowVisible.value = true
    }
    else {
      const errorList = data.payload?.map(item => item.message).join(', ')
      callHanaMessage({
        message: errorList || '注册失败。',
        type: 'error',
      })
    }
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

function handleUserCommand(command: string | number | object) {
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
    case '发布动态':
      activityWindowVisible.value = true
      break
    case '退出登录':
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
  }
}
</script>

<template>
  <!-- 由于 pinia store 数组存储至 localStorage，因此必须客户端渲染 -->
  <ClientOnly v-if="!loggedIn">
    <HanaDropdown animation="slide" offset="end" :show-arrow="false" @command="handleUserCommand">
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
        <HanaInput name="account" prefix-icon="lucide:user-round" shape="rounded" placeholder="用户名 / 邮箱" />
        <HanaInput name="password" prefix-icon="lucide:key-round" shape="rounded" type="password" placeholder="密码" />
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
        <HanaInput name="username" prefix-icon="lucide:user-round" shape="rounded" placeholder="用户名" />
        <HanaInput name="email" prefix-icon="lucide:mail" shape="rounded" placeholder="邮箱" />
        <HanaInput name="site" prefix-icon="lucide:globe" shape="rounded" placeholder="站点（无可不填）" />
        <HanaInput name="password" prefix-icon="lucide:key-round" shape="rounded" type="password" placeholder="密码" />
      </div>
      <div class="mt-8 flex flex-col gap-4">
        <HanaButton class="w-full" dark-mode type="submit">
          {{ registerBtnText }}
        </HanaButton>
        <HanaButton class="w-full" @click="toggleLoginRegisterWindow">
          <span class="text-hana-blue dark:text-hana-blue-200">已有帐号</span>
        </HanaButton>
      </div>
    </form>
  </HanaDialog>
  <RecentlySubmit v-model="activityWindowVisible" />
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
