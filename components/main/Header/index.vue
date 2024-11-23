<script setup lang="ts">
import { useStore } from '~/store'

const { t } = useI18n()

const { routesMap } = useRoutesMap()
const { userStore } = useStore()

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

const route = useRoute()
const { path } = toRefs(route)
const activeStatus = ref(Array.from<boolean>({ length: routesMap.size }).fill(false))
const rootRoute = computed(() => `/${path.value.split('/')[1]}`)
watchEffect(() => {
  activeStatus.value = Array.from<boolean>({ length: routesMap.size }).fill(false)
  activeStatus.value[Array.from(routesMap.keys()).indexOf(rootRoute.value)] = true
})

const curMode = ref<'light' | 'dark'>('light')
function changeMode() {
  curMode.value = curMode.value === 'light' ? 'dark' : 'light'
}

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
  }
}

async function handleSubmit(type: 'login' | 'register', e: Event) {
  switch (type) {
    case 'login':
      if (e.target) {
        const formData = new FormData(e.target as HTMLFormElement)
        const { data } = await useFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(formData)) })
        if (data.value?.success) {
          localStorage.setItem('token', data.value.payload!.token)
          userStore.setUserInfo(data.value.payload!.userInfo)
          loginWindowVisible.value = false
        }
      }
      break
    case 'register':
      if (e.target) {
        const formData = new FormData(e.target as HTMLFormElement)
        const { data } = useFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(Object.fromEntries(formData)) })
        if (data.value?.success) {
          loginWindowVisible.value = true
        }
      }
      break
  }
}

const drawerVisible = ref(false)
function toggleDrawerVisible() {
  drawerVisible.value = !drawerVisible.value
}

const headerTop = ref('0px')
let lastScrollY = 0

function handleScroll() {
  if (route.meta.name === 'article-detail') {
    const currentScrollY = window.scrollY
    if (currentScrollY > lastScrollY) {
      headerTop.value = '-100px'
    }
    else {
      headerTop.value = '0px'
    }
    lastScrollY = currentScrollY
  }
}

const debouncedHandleScroll = useDebounceFn(handleScroll, 50)

onMounted(() => {
  window.addEventListener('scroll', debouncedHandleScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', debouncedHandleScroll)
})
</script>

<template>
  <div
    class="relative flex h-12 w-full justify-center bg-[#fff8] shadow-md backdrop-blur transition-all"
    :style="{ top: headerTop }"
  >
    <div class="relative mx-auto flex size-full items-center justify-between px-2 md:max-w-[90%] xl:max-w-[70%]">
      <HanaButton
        class="block md:hidden"
        icon-button
        icon="lucide:align-justify"
        @click="toggleDrawerVisible"
      />

      <HanaLogo class="absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0" />

      <div class="absolute left-1/2 hidden -translate-x-1/2 gap-0 transition-all md:flex lg:gap-4">
        <HanaButton
          v-for="([key, value], index) in routesMap" :key="key"
          :type="value.to === rootRoute ? 'common' : 'icon'"
          :show-slot="value.to === rootRoute"
          :icon="value.icon"
          :to="value.to"
          :active="activeStatus[index]"
        >
          {{ value.title }}
        </HanaButton>
      </div>

      <div class="flex gap-0 transition-all lg:gap-4">
        <HanaButton
          icon-button
          :icon="curMode === 'light' ? 'lucide:moon' : 'lucide:sun'"
          class="ml-auto"
          @click="changeMode"
        />
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
          <div v-else class="size-8 cursor-pointer rounded-full bg-hana-blue text-center text-2xl text-white">
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
      </div>
    </div>
  </div>
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
  <div class="block md:hidden">
    <MainHeaderDrawer v-model="drawerVisible" :active-status="activeStatus" />
  </div>
</template>
