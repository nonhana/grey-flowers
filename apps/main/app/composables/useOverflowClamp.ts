import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useOverflowClamp(
  containerRef: Readonly<Ref<HTMLElement | null>>,
  contentRef: Readonly<Ref<HTMLElement | null>>,
) {
  const clamped = ref(false)

  function measure() {
    const container = containerRef.value
    if (!container)
      return
    clamped.value = container.scrollHeight > container.clientHeight + 1
  }

  let observer: ResizeObserver | null = null

  onMounted(() => {
    measure()
    observer = new ResizeObserver(measure)
    if (containerRef.value)
      observer.observe(containerRef.value)
    if (contentRef.value)
      observer.observe(contentRef.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { clamped }
}
