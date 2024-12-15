<script setup lang="ts">
const props = withDefaults(defineProps<{
  avatar: string | null
  username: string
  site: string | null
  size: number
  showInfo?: boolean
}>(), {
  showInfo: true,
})

const [visible, toggleVisible] = useToggle(false)

function handleClick() {
  if (props.showInfo) {
    toggleVisible()
  }
}
</script>

<template>
  <div class="shrink-0 cursor-pointer overflow-hidden rounded-full" @click="handleClick">
    <NuxtImg
      v-if="avatar"
      :src="avatar"
      :style="{ width: `${size / 4}rem`, height: `${size / 4}rem` }"
    />
    <div
      v-else
      class="flex select-none items-center justify-center bg-hana-blue text-xl text-white"
      :style="{ width: `${size / 4}rem`, height: `${size / 4}rem` }"
    >
      <span>{{ username[0] }}</span>
    </div>
  </div>
  <HanaUserInfoWindow v-model="visible" v-bind="{ avatar, username, site }" />
</template>
