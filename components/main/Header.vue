<script setup lang="ts">
const routesMap = new Map([
  ['/', { text: '主页', icon: 'lucide:house', to: '/' }],
  ['/articles', { text: '文章', icon: 'lucide:notebook-pen', to: '/articles' }],
  ['/thoughts', { text: '碎碎念', icon: 'lucide:messages-square', to: '/thoughts' }],
  ['/about', { text: '关于', icon: 'lucide:info', to: '/about' }],
  ['/friends', { text: '友链', icon: 'lucide:link', to: '/friends' }],
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

      <HanaLogo class="absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0" />

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
          @click="handleClick"
        />
      </div>
    </div>
  </div>
</template>
