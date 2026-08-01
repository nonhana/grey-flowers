import type { Ref } from 'vue'

export function floatAnimation(opacity: Ref<number>, top: Ref<string>) {
  opacity.value = 0
  top.value = '10px'
  setTimeout(() => {
    opacity.value = 1
    top.value = '0'
  }, 100)
}
