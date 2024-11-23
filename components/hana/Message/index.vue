<script setup lang="ts">
import type { MessageOptions } from './useMessage'

const props = withDefaults(defineProps<MessageOptions>(), {
  message: '默认消息',
  type: 'info',
  timeout: 3000,
  position: 'top',
})

const visible = ref(false)

onMounted(() => {
  visible.value = true
  setTimeout(() => {
    visible.value = false
  }, props.timeout)
})

type NonUndefined<T> = T extends undefined ? never : T

const messageClasses: Record<NonUndefined<MessageOptions['type']>, string> = {
  info: 'bg-hana-blue-100 text-hana-blue border-hana-blue border-2',
  success: 'bg-green-100 text-green-600 border-green-600 border-2',
  warning: 'bg-yellow-100 text-yellow-600 border-yellow-600 border-2',
  error: 'bg-red-100 text-red-600 border-red-600 border-2',
}
</script>

<template>
  <div
    v-if="visible"
    class="flex shrink-0 items-center gap-2 text-nowrap rounded-lg p-3 text-sm shadow-lg"
    :class="messageClasses[props.type]"
  >
    <HanaMessageIcon :type="type" />
    <span>{{ props.message }}</span>
  </div>
</template>
