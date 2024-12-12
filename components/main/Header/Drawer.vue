<script setup lang="ts">
withDefaults(defineProps<{
  activeStatus: boolean[]
}>(), {
  activeStatus: () => [],
})

const { routesMap } = useRoutesMap()

const visible = defineModel<boolean>()
</script>

<template>
  <HanaDrawer v-model="visible" direction="left" title="路由导航" icon="lucide:route" width="240px">
    <template #default="{ close }">
      <div class="mx-auto flex flex-col overflow-auto text-text">
        <div class="my-5 flex flex-col gap-2" @click="close">
          <HanaButton
            v-for="([key, value], index) in routesMap" :key="key"
            :icon="value.icon"
            :to="value.to"
            :aria-label="value.title"
            :active="activeStatus[index]"
            shape="square"
          >
            {{ value.title }}
          </HanaButton>
        </div>
      </div>
    </template>
  </HanaDrawer>
</template>
