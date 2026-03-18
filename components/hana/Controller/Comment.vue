<script lang="ts" setup>
import { useStore } from '~/store'

const { dialogStore } = useStore()
const { progress } = useLoadingIndicator()
const route = useRoute()

const commentWhiteList = ['/recently'] // 在白名单中的路径不显示评论

const hasComments = ref(false)

const visible = computed(() => dialogStore.dialogCount === 0 && hasComments.value)

function checkCommentsExistence() {
  if (commentWhiteList.includes(route.path))
    return null
  const commentsElement = document.querySelector('#comments')
  hasComments.value = !!commentsElement
  return commentsElement
}

onMounted(() => {
  setTimeout(() => {
    checkCommentsExistence()
  }, 300)
})

watch(progress, (newV) => {
  if (newV === 100) {
    setTimeout(() => {
      checkCommentsExistence()
    }, 300)
  }
})

function scrollToComments() {
  const commentsElement = checkCommentsExistence()
  if (commentsElement) {
    commentsElement.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div v-if="visible" class="relative hana-card">
    <HanaTooltip content="滚到评论" position="left" animation="slide">
      <div class="size-10 hana-button items-center justify-center" @click="scrollToComments">
        <svg class="absolute" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
        </svg>
      </div>
    </HanaTooltip>
  </div>
</template>
