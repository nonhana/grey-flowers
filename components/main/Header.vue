<script setup lang="ts">
const { t } = useI18n()

const { routesMap, articlesMap } = useRoutesMap()

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
</script>

<template>
  <div class="flex h-12 w-full justify-center bg-[#fff8] shadow-md backdrop-blur">
    <div class="relative mx-auto flex size-full items-center justify-between px-2 md:max-w-[90%] xl:max-w-[70%]">
      <HanaDropdown trigger="click" animation="slide" offset="start" :show-arrow="false" class="md:hidden">
        <HanaButton
          type="icon"
          icon="lucide:align-justify"
        />
        <template #dropdown>
          <HanaDropdownMenu>
            <HanaDropdownItem
              v-for="([key, value], index) in routesMap"
              :key="key"
              :icon="value.icon"
              :active="activeStatus[index]"
              :to="value.to"
            >
              {{ value.title }}
            </HanaDropdownItem>
          </HanaDropdownMenu>
        </template>
      </HanaDropdown>

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
          type="icon"
          :icon="curMode === 'light' ? 'lucide:moon' : 'lucide:sun'"
          class="ml-auto"
          @click="changeMode"
        />
        <HanaDropdown animation="slide" offset="end" :show-arrow="false">
          <HanaButton
            type="icon"
            icon="lucide:user-round"
            class="ml-auto"
          />
          <template #dropdown>
            <HanaDropdownMenu>
              <HanaDropdownItem
                v-for="item in notLoggedInMap"
                :key="item.text"
                :icon="item.icon"
              >
                {{ item.text }}
              </HanaDropdownItem>
            </HanaDropdownMenu>
          </template>
        </HanaDropdown>
      </div>
    </div>
  </div>
</template>
