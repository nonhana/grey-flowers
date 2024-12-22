<script setup lang="ts">
const props = withDefaults(defineProps<{
  avatar: string
  username: string
  site: string | null
  showInfo?: boolean
  class?: string
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
  <span class="cursor-pointer font-bold text-hana-blue-400" :class="props.class" @click="handleClick">{{ username }}</span>
  <UserInfoViewer v-model="visible" v-bind="{ avatar, username, site }" />
</template>
