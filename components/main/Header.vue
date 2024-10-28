<script setup lang="ts">
const { t } = useI18n()

const routesMap = new Map([
  ['/', { text: t('header.routes.home.name'), icon: 'lucide:house', to: '/' }],
  ['/articles', { text: t('header.routes.articles.name'), icon: 'lucide:notebook-pen', to: '/articles' }],
  ['/thoughts', { text: t('header.routes.thoughts.name'), icon: 'lucide:messages-square', to: '/thoughts' }],
  ['/about', { text: t('header.routes.about.name'), icon: 'lucide:info', to: '/about' }],
  ['/friends', { text: t('header.routes.friends.name'), icon: 'lucide:link', to: '/friends' }],
])

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
              {{ value.text }}
            </HanaDropdownItem>
          </HanaDropdownMenu>
        </template>
      </HanaDropdown>

      <HanaLogo class="absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0" />

      <div class="absolute left-1/2 hidden -translate-x-1/2 gap-0 transition-all md:flex lg:gap-4">
        <HanaButton
          v-for="([key, value], index) in routesMap"
          :key="key"
          :type="value.to === rootRoute ? 'common' : 'icon'"
          :show-slot="value.to === rootRoute"
          :icon="value.icon"
          :to="value.to"
          :active="activeStatus[index]"
        >
          {{ value.text }}
        </HanaButton>
      </div>

      <div class="flex gap-0 transition-all lg:gap-4">
        <HanaButton
          type="icon"
          :icon="curMode === 'light' ? 'lucide:moon' : 'lucide:sun'"
          class="ml-auto"
          @click="changeMode"
        />
        <HanaButton
          type="icon"
          icon="lucide:user-round"
          class="ml-auto"
        />
      </div>
    </div>
  </div>
</template>
