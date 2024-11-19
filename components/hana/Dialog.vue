<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  overlayOpacity?: number
  hideHeader?: boolean
  width?: string
  height?: string
}>(), {
  title: '默认标题',
  overlayOpacity: 0.5,
  hideHeader: false,
  width: '400px',
  height: 'auto',
})

const visible = defineModel<boolean>()

function handleClose() {
  visible.value = false
}

const transitionClasses = {
  enterActiveClass: 'transition-all duration-300',
  enterFromClass: 'opacity-0 scale-105',
  enterToClass: 'opacity-100',
  leaveActiveClass: 'transition-all duration-300',
  leaveFromClass: 'opacity-100',
  leaveToClass: 'opacity-0 scale-95',
}
</script>

<template>
  <transition v-bind="transitionClasses">
    <div
      v-if="visible"
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
      <div :style="{ height }">
        <slot />
      </div>
      <div v-if="$slots.footer" class="mt-5">
        <slot name="footer" />
      </div>
    </div>
  </transition>
  <div
    class="fixed inset-0 z-40 bg-black transition-opacity duration-300"
    :class="{ 'pointer-events-none': !visible }"
    :style="{ opacity: visible ? overlayOpacity : 0 }"
    @click="handleClose"
  />
</template>
