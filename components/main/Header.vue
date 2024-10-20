<script setup lang="ts">
const { t } = useI18n()

const routesMap = new Map([
  ['/', { text: t('header.home.name'), icon: 'lucide:house', to: '/' }],
  ['articles', { text: t('header.articles.name'), icon: 'lucide:notebook-pen', to: '/articles' }],
  ['thoughts', { text: t('header.thoughts.name'), icon: 'lucide:messages-square', to: '/thoughts' }],
  ['about', { text: t('header.about.name'), icon: 'lucide:info', to: '/about' }],
  ['friends', { text: t('header.friends.name'), icon: 'lucide:link', to: '/friends' }],
])

const route = useRoute()
const { fullPath } = toRefs(route)
const activeStatus = ref(Array.from<boolean>({ length: routesMap.size }).fill(false))
watchEffect(() => {
  activeStatus.value = Array.from<boolean>({ length: routesMap.size }).fill(false)
  activeStatus.value[Array.from(routesMap.keys()).indexOf(fullPath.value)] = true
})

const curMode = ref<'light' | 'dark'>('light')
function changeMode() {
  curMode.value = curMode.value === 'light' ? 'dark' : 'light'
}

function handleClick() {
  console.log('click')
}
</script>

<template>
  <div class="flex h-[50px] w-full justify-center bg-[#fff8] shadow-md backdrop-blur">
    <div class="relative flex h-full w-[92%] max-w-[1200px] items-center justify-between">
      <HanaButton
        type="icon"
        icon="lucide:align-justify"
        class="md:hidden"
        @click="handleClick"
      />

      <HanaTooltip content="主页" animation="slide">
        <HanaLogo class="absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0" />
      </HanaTooltip>

      <div class="absolute left-1/2 hidden -translate-x-1/2 gap-0 transition-all md:flex lg:gap-4">
        <HanaButton
          v-for="([key, value], index) in routesMap"
          :key="key"
          :type="value.to === fullPath ? 'common' : 'icon'"
          :text="value.text"
          :icon="value.icon"
          :to="value.to"
          :active="activeStatus[index]"
        />
      </div>

      <div class="flex gap-0 transition-all lg:gap-4">
        <HanaTooltip content="切换显示模式" animation="slide">
          <HanaButton
            type="icon"
            :icon="curMode === 'light' ? 'lucide:moon' : 'lucide:sun'"
            class="ml-auto"
            @click="changeMode"
          />
        </HanaTooltip>
        <HanaButton
          type="icon"
          icon="lucide:user-round"
          class="ml-auto"
          @click="handleClick"
        />
      </div>
    </div>
  </div>
</template>
