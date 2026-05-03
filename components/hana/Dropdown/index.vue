<script setup lang="ts">
import type { DropdownCommand } from '~/types/common'

const props = withDefaults(defineProps<{
  showArrow?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  offset?: 'start' | 'center' | 'end'
  trigger?: 'hover' | 'click' | 'auto'
  animation?: 'fade' | 'slide'
  clickClose?: boolean
}>(), {
  showArrow: true,
  position: 'bottom',
  offset: 'center',
  trigger: 'auto',
  animation: 'slide',
  clickClose: true,
})

const emits = defineEmits<{
  command: [command: DropdownCommand]
}>()

// 事件委托触发点击事件
function handleClick(e: MouseEvent, fn: () => void) {
  const target = e.target as HTMLElement
  const tagName = target.tagName.toLowerCase()
  if (tagName === 'a' || tagName === 'li') {
    target.dataset.command && emits('command', target.dataset.command)
    props.clickClose && fn()
  }
}
</script>

<template>
  <div>
    <HanaTooltip
      type="dropdown"
      :position="position"
      :offset="offset"
      :trigger="trigger"
      :animation="animation"
      :show-arrow="showArrow"
    >
      <slot v-if="$slots.default" />
      <template #content="{ close }">
        <div @click="($event) => handleClick($event, close)">
          <slot name="dropdown" :click="close" />
        </div>
      </template>
    </HanaTooltip>
  </div>
</template>
