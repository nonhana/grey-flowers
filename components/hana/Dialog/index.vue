<script setup lang="ts">
import type { TransitionProps } from 'vue'
import type { DialogOptions } from './useDialog'

withDefaults(defineProps<DialogOptions>(), {
  title: '默认标题',
  overlayOpacity: 0.5,
  hideHeader: false,
  width: '400px',
  height: 'auto',
  programmatic: false,
})

const emits = defineEmits<{
  (e: 'Ok'): void
  (e: 'Cancel'): void
  (e: 'destroy'): void
  (e: 'update:modelValue', value: boolean): void
}>()

function handleClose() {
  emits('update:modelValue', false)
}

const transitionClasses: TransitionProps = {
  enterActiveClass: 'transition-all duration-300',
  enterFromClass: 'opacity-0 scale-105',
  enterToClass: 'opacity-100',
  leaveActiveClass: 'transition-all duration-300',
  leaveFromClass: 'opacity-100',
  leaveToClass: 'opacity-0 scale-95',
}

function handleAfterLeave() {
  emits('destroy')
}
</script>

<template>
  <transition v-bind="transitionClasses" @after-leave="handleAfterLeave">
    <div
      v-if="modelValue"
      class="fixed left-1/2 top-1/2 z-50 max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow"
      :style="{ width }"
    >
      <div class="mb-5">
        <slot
          name="header"
          :close="handleClose"
        >
          <div v-if="!hideHeader" class="flex items-center">
            <span v-if="title" class="text-2xl font-bold">{{ title }}</span>
            <HanaButton icon="lucide:x" class="relative -right-2 -top-2 ml-auto" icon-button @click="handleClose" />
          </div>
        </slot>
      </div>
      <div v-if="programmatic">
        <span>{{ content }}</span>
      </div>
      <div v-else :style="{ height }">
        <slot />
      </div>
      <div v-if="programmatic" class="mt-5 flex justify-end gap-4">
        <HanaButton
          v-if="showCancelButton || false"
          @click="emits('Cancel')"
        >
          {{ cancelText || '取消' }}
        </HanaButton>
        <HanaButton
          v-if="showOkButton || true"
          dark-mode
          @click="emits('Ok')"
        >
          {{ okText || '确定' }}
        </HanaButton>
      </div>
      <div v-else-if="$slots.footer" class="mt-5">
        <slot name="footer" />
      </div>
    </div>
  </transition>
  <div
    class="fixed inset-0 z-40 bg-black transition-opacity duration-300"
    :class="{ 'pointer-events-none': !modelValue }"
    :style="{ opacity: modelValue ? overlayOpacity : 0 }"
    @click="handleClose"
  />
</template>
