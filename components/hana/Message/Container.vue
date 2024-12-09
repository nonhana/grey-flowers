<script setup lang="ts">
import type { MessageOptions } from '~/composables/useMessage'
import Message from './Item.vue'

interface MessageItem extends MessageOptions {
  key: number
}

const messages = ref<MessageItem[]>([])
let keyCounter = 0

function addMessage(options: MessageOptions) {
  const key = keyCounter++
  messages.value.push({ ...options, key })

  setTimeout(() => {
    removeMessage(key)
  }, options.timeout || 3000)
}

function removeMessage(key: number) {
  messages.value = messages.value.filter(msg => msg.key !== key)
}

const messageContainerRef = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (messageContainerRef.value) {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          messageContainerRef.value!.style.width = `${entry.contentRect.width}px`
        }
      }
    })
    observer.observe(messageContainerRef.value)
  }
})

onUnmounted(() => {
  observer && observer.disconnect()
})

defineExpose({
  addMessage,
})
</script>

<template>
  <div
    ref="messageContainerRef"
    class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-4"
  >
    <transition-group name="message-container">
      <div v-for="msg in messages" :key="msg.key" class="relative">
        <Message v-bind="msg" />
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.message-container-move,
.message-container-enter-active,
.message-container-leave-active {
  transition: all 0.3s ease;
}

.message-container-enter-from,
.message-container-leave-to {
  transform: translateY(calc(-100% - 1rem));
}

.message-container-leave-active {
  position: absolute;
}
</style>
