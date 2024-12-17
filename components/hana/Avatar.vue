<script setup lang="ts">
const props = withDefaults(defineProps<{
  avatar: string
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
    <NuxtImg :src="avatar" :style="{ width: `${size / 4}rem`, height: `${size / 4}rem` }" />
  </div>
  <UserInfoViewer v-model="visible" v-bind="{ avatar, username, site }" />
</template>
