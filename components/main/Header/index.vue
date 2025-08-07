<script setup lang="ts">
const { routesMap } = useRoutesMap()

const route = useRoute()
const { path } = toRefs(route)
const activeStatus = ref(Array.from<boolean>({ length: routesMap.size }).fill(false))
const rootRoute = computed(() => `/${path.value.split('/')[1]}`)
watchEffect(() => {
  activeStatus.value = Array.from<boolean>({ length: routesMap.size }).fill(false)
  activeStatus.value[Array.from(routesMap.keys()).indexOf(rootRoute.value)] = true
})

const drawerVisible = ref(false)
function toggleDrawerVisible() {
  drawerVisible.value = !drawerVisible.value
}
</script>

<template>
  <div class="relative h-12 w-full flex justify-center bg-[#fff8] shadow-md backdrop-blur dark:bg-hana-black">
    <div class="relative mx-auto size-full flex items-center justify-between px-2 md:max-w-[90%] xl:max-w-[70%]">
      <HanaButton
        class="block md:hidden"
        icon-button
        icon="lucide:align-justify"
        @click="toggleDrawerVisible"
      />

      <HanaLogo class="absolute left-1/2 md:relative md:left-0 -translate-x-1/2 md:translate-x-0" />

      <div class="absolute left-1/2 gap-0 transition-all hidden md:flex -translate-x-1/2 lg:gap-4">
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
        <MainHeaderThemes />
        <MainHeaderUser />
      </div>
    </div>
  </div>
  <div class="block md:hidden">
    <MainHeaderDrawer v-model="drawerVisible" :active-status="activeStatus" />
  </div>
</template>
