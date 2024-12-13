<script setup lang="ts">
import { useStore } from '~/store'

const { routesMap } = useRoutesMap()

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

const drawerVisible = ref(false)
function toggleDrawerVisible() {
  drawerVisible.value = !drawerVisible.value
}
</script>

<template>
  <div class="relative flex h-12 w-full justify-center bg-[#fff8] shadow-md backdrop-blur">
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
          :icon-button="value.to !== rootRoute"
          :icon="value.icon"
          :to="value.to"
          :aria-label="value.title"
          :active="activeStatus[index]"
        >
          {{ value.title }}
        </HanaButton>
      </div>

      <div class="flex gap-4">
        <HanaButton
          icon-button
          :icon="curMode === 'light' ? 'lucide:moon' : 'lucide:sun'"
          class="ml-auto hidden"
          @click="changeMode"
        />
        <MainHeaderUser />
      </div>
    </div>
  </div>
  <div class="block md:hidden">
    <MainHeaderDrawer v-model="drawerVisible" :active-status="activeStatus" />
  </div>
</template>
