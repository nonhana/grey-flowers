import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'

const ZOOM_STEP = 0.2 // 每次滚轮缩放的步长
const ZOOM_MIN = 0.2 // 缩放最小值
const ZOOM_MAX = 10 // 缩放最大值

// 获取目标元素的 transform 位置（初始化）
function getTargetPosition(targetRef: Ref<HTMLElement | null>) {
  if (targetRef.value) {
    let X = 0
    let Y = 0
    const transform = window.getComputedStyle(targetRef.value).transform
    if (transform !== 'none') {
      const match = transform.match(/matrix\((.+)\)/)
      if (match) {
        const matrixValues = match[1].split(', ')
        X = Number.parseFloat(matrixValues[4]) || 0
        Y = Number.parseFloat(matrixValues[5]) || 0
      }
    }
    else {
      X = 0
      Y = 0
    }
    return [X, Y] as const
  }
  return [0, 0] as const
}

export default function useTransformer(targetRef: Ref<HTMLElement | null>) {
  let initialDistance = 0 // 缩放时，初始两指距离

  let initialMouseX = 0 // 按下鼠标时，鼠标的初始位置 X
  let initialMouseY = 0 // 按下鼠标时，鼠标的初始位置 Y
  let initialBoxX = 0 // 初始大图的 transform X 偏移
  let initialBoxY = 0 // 初始大图的 transform Y 偏移

  const currentTranslateX = ref(0) // 当前大图的 transform X 偏移
  const currentTranslateY = ref(0) // 当前大图的 transform Y 偏移

  const zoomLevel = ref(1) // 缩放级别，初始为 1

  const dragging = ref(false) // 是否正在拖动大图
  watch(dragging, (newV) => {
    if (targetRef.value) {
      targetRef.value.style.cursor = newV ? 'grabbing' : 'grab'
    }
  })

  const newImgTransform = computed(
    () =>
      `translate(${
        currentTranslateX.value === 0 ? '-50%' : `${currentTranslateX.value}px`
      }, ${
        currentTranslateY.value === 0 ? '-50%' : `${currentTranslateY.value}px`
      }) scale(${zoomLevel.value})`,
  )

  const handleWheel = (event: WheelEvent) => {
    if (targetRef.value) {
      zoomLevel.value += event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
      zoomLevel.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel.value))
      setStyles(targetRef.value, {
        transform: newImgTransform.value,
      })
    }
  }

  const handleDblclick = () => {
    if (targetRef.value) {
      zoomLevel.value = zoomLevel.value > 1 ? 1 : 2
      setStyles(targetRef.value, {
        transform: newImgTransform.value,
      })
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (targetRef.value) {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const newDistance = getDistance(
          [touch1.pageX, touch1.pageY],
          [touch2.pageX, touch2.pageY],
        )
        const scaleChange = newDistance / initialDistance
        zoomLevel.value = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, zoomLevel.value * scaleChange),
        )
        initialDistance = newDistance
      }
      else if (e.touches.length === 1) {
        const touch = e.touches[0]
        const deltaX = touch.pageX - initialMouseX
        const deltaY = touch.pageY - initialMouseY

        currentTranslateX.value = initialBoxX + deltaX
        currentTranslateY.value = initialBoxY + deltaY
      }

      setStyles(targetRef.value, {
        transform: newImgTransform.value,
      })
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      initialDistance = 0
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (targetRef.value) {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        initialDistance = getDistance(
          [touch1.pageX, touch1.pageY],
          [touch2.pageX, touch2.pageY],
        )
      }
      else if (e.touches.length === 1) {
        const touch = e.touches[0]
        initialMouseX = touch.pageX
        initialMouseY = touch.pageY
        ;[initialBoxX, initialBoxY] = getTargetPosition(targetRef)
      }

      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (targetRef.value) {
      const deltaX = e.clientX - initialMouseX
      const deltaY = e.clientY - initialMouseY

      currentTranslateX.value = initialBoxX + deltaX
      currentTranslateY.value = initialBoxY + deltaY

      setStyles(targetRef.value, {
        transform: newImgTransform.value,
      })
    }
  }

  const handleMouseUp = () => {
    dragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (targetRef.value) {
      dragging.value = true
      initialMouseX = e.clientX
      initialMouseY = e.clientY
      ;[initialBoxX, initialBoxY] = getTargetPosition(targetRef)

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }

  const initMover = () => {
    currentTranslateX.value = 0
    currentTranslateY.value = 0
    zoomLevel.value = 1
  }

  return {
    handleWheel,
    handleDblclick,
    handleTouchStart,
    handleMouseDown,
    initMover,
  }
}
