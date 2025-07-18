<script setup lang="ts">
import type { TransitionProps } from 'vue'
import type { DialogOptions } from '~/composables/useDialog'
import { useStore } from '~/store'

const props = withDefaults(defineProps<DialogOptions>(), {
  title: '',
  overlayOpacity: 0.5,
  hideHeader: false,
  width: '400px',
  height: 'auto',
  programmatic: false,
})

const emits = defineEmits<{
  (e: 'ok'): void
  (e: 'cancel'): void
  (e: 'destroy'): void
  (e: 'update:modelValue', value: boolean): void
}>()

const { dialogStore } = useStore()
const { increaseDialogCount, decreaseDialogCount, getDialogCount } = dialogStore
const { dialogCount } = toRefs(dialogStore)

const { toggleScrollable } = useToggleScrollable()

const programmaticVisible = ref(false)
const visible = computed(() => props.programmatic ? programmaticVisible.value : props.modelValue)

const dialogZIndex = ref(40)

onMounted(() => {
  if (props.programmatic) {
    programmaticVisible.value = true
  }
})

function handleClose() {
  if (props.programmatic) {
    programmaticVisible.value = false
  }
  else {
    emits('update:modelValue', false)
  }
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

const overlayRef = ref<HTMLDivElement | null>(null)
watch(visible, (newV) => {
  if (newV) {
    if (!dialogCount.value) {
      toggleScrollable(newV)
    }
    dialogZIndex.value = 40 + getDialogCount()
    increaseDialogCount()
  }
  else {
    if (dialogCount.value) {
      toggleScrollable(newV)
    }
    dialogZIndex.value = 40
    decreaseDialogCount()
  }
  if (overlayRef.value) {
    if (newV) {
      requestAnimationFrame(() => {
        overlayRef.value!.style.opacity = String(props.overlayOpacity)
      })
    }
    else {
      overlayRef.value!.style.opacity = '0'
    }
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({
  handleClose,
})
</script>

<template>
  <teleport to="body">
    <div
      ref="overlayRef"
      class="fixed inset-0 bg-black opacity-0 transition-opacity duration-300"
      :class="{ 'pointer-events-none': !visible }"
      :style="{ zIndex: dialogZIndex }"
      @click="handleClose"
    />
    <transition v-bind="transitionClasses" @after-leave="handleAfterLeave">
      <div
        v-if="visible"
        id="hana-dialog"
        class="fixed left-1/2 top-1/2 max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow dark:bg-hana-black"
        :style="{ width, zIndex: dialogZIndex }"
      >
        <div class="mb-5">
          <slot
            name="header"
            :close="handleClose"
          >
            <div v-if="!hideHeader" class="flex items-center">
              <span v-if="title" class="flex-1 text-2xl font-bold dark:text-hana-white">{{ title }}</span>
              <HanaButton v-if="!programmatic" icon="lucide:x" class="relative -right-2 -top-2 ml-auto" icon-button @click="handleClose" />
            </div>
          </slot>
        </div>
        <div v-if="programmatic">
          <span class="dark:text-hana-white">{{ content }}</span>
        </div>
        <div v-else class="max-h-[80vh] overflow-y-auto" :style="{ height }">
          <slot />
        </div>
        <div v-if="programmatic" class="mt-5 flex justify-end gap-4">
          <HanaButton
            v-if="showCancelButton || false"
            shape="square"
            class="w-20"
            @click="emits('cancel')"
          >
            {{ cancelText || '取消' }}
          </HanaButton>
          <HanaButton
            v-if="showOkButton || true"
            dark-mode
            shape="square"
            class="w-20"
            @click="emits('ok')"
          >
            {{ okText || '确定' }}
          </HanaButton>
        </div>
        <div v-else-if="$slots.footer" class="mt-5">
          <slot name="footer" />
        </div>
      </div>
    </transition>
  </teleport>
</template>
