<script setup lang="ts">
import type { TransitionProps } from 'vue'
import type { MessageOptions } from './useMessage'

const props = withDefaults(defineProps<MessageOptions>(), {
  message: '默认消息',
  type: 'info',
  timeout: 3000,
  position: 'top',
})

const emits = defineEmits<{
  (e: 'destroy'): void
}>()

const visible = ref(false)

const transitionClasses: TransitionProps = {
  enterActiveClass: 'transition-all duration-300',
  enterFromClass: 'translate-y-[calc(-100%-1rem)]',
  enterToClass: 'translate-y-0',
  leaveActiveClass: 'transition-all duration-300',
  leaveFromClass: 'translate-y-0',
  leaveToClass: 'translate-y-[calc(-100%-1rem)]',
}

onMounted(() => {
  visible.value = true
  setTimeout(() => {
    visible.value = false
  }, props.timeout)
})

function handleAfterLeave() {
  emits('destroy')
}
</script>

<template>
  <transition v-bind="transitionClasses" @after-leave="handleAfterLeave">
    <div
      v-if="visible"
      class="fixed left-1/2 z-50 -translate-x-1/2 rounded-lg p-3 text-sm shadow-lg"
      :class="{
        'bg-blue-100': props.type === 'info',
        'bg-green-100': props.type === 'success',
        'bg-yellow-100': props.type === 'warning',
        'bg-red-100': props.type === 'error',
        'text-blue-800': props.type === 'info',
        'text-green-800': props.type === 'success',
        'text-yellow-800': props.type === 'warning',
        'text-red-800': props.type === 'error',
        'top-4': props.position === 'top',
        'bottom-4': props.position === 'bottom',
      }"
    >
      {{ props.message }}
    </div>
  </transition>
</template>
