<script setup lang="ts">
import type { MessageOptions } from './useMessage'
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

defineExpose({
  addMessage,
})
</script>

<template>
  <div class="fixed left-1/2 top-4 z-50 flex w-full -translate-x-1/2 flex-col gap-4">
    <transition-group name="message_container">
      <div
        v-for="msg in messages"
        :key="msg.key"
        class="flex w-full justify-center"
      >
        <Message v-bind="msg" />
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.message_container-move,
.message_container-enter-active,
.message_container-leave-active {
  transition: all 0.3s ease;
}

.message_container-enter-from,
.message_container-leave-to {
  transform: translateY(calc(-100% - 1rem));
}

.message_container-leave-active {
  position: absolute;
}
</style>
