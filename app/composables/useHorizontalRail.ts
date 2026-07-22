import { useMediaQuery } from '@vueuse/core'
import { reactive, ref } from 'vue'

interface UseHorizontalRailOptions {
  dragThreshold?: number
  inertiaLaunchVelocity?: number
  inertiaStopVelocity?: number
  inertiaMaxVelocity?: number
  inertiaDecay?: number
  inertiaFrameMs?: number
  inertiaSampleMinDt?: number
  inertiaVelocityBlend?: number
}

const DEFAULT_DRAG_THRESHOLD = 8
const DEFAULT_INERTIA_LAUNCH_VELOCITY = 0.08
const DEFAULT_INERTIA_STOP_VELOCITY = 0.02
const DEFAULT_INERTIA_MAX_VELOCITY = 2.2
const DEFAULT_INERTIA_DECAY = 0.94
const DEFAULT_INERTIA_FRAME_MS = 16.7
const DEFAULT_INERTIA_SAMPLE_MIN_DT = 4
const DEFAULT_INERTIA_VELOCITY_BLEND = 0.35

export function useHorizontalRail(options: UseHorizontalRailOptions = {}) {
  const {
    dragThreshold = DEFAULT_DRAG_THRESHOLD,
    inertiaLaunchVelocity = DEFAULT_INERTIA_LAUNCH_VELOCITY,
    inertiaStopVelocity = DEFAULT_INERTIA_STOP_VELOCITY,
    inertiaMaxVelocity = DEFAULT_INERTIA_MAX_VELOCITY,
    inertiaDecay = DEFAULT_INERTIA_DECAY,
    inertiaFrameMs = DEFAULT_INERTIA_FRAME_MS,
    inertiaSampleMinDt = DEFAULT_INERTIA_SAMPLE_MIN_DT,
    inertiaVelocityBlend = DEFAULT_INERTIA_VELOCITY_BLEND,
  } = options

  const isDragging = ref(false)
  const suppressNextSelect = ref(false)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  let suppressResetRaf: number | null = null

  const pointerState = reactive({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
  })

  const momentumState = reactive({
    momentumRaf: null as number | null,
    momentumVelocity: 0,
    lastSampleX: 0,
    lastSampleTs: 0,
    lastSampleScrollLeft: 0,
    isMomentumActive: false,
  })

  function clearSuppressReset() {
    if (suppressResetRaf === null || typeof window === 'undefined')
      return

    window.cancelAnimationFrame(suppressResetRaf)
    suppressResetRaf = null
  }

  function scheduleSuppressReset() {
    if (typeof window === 'undefined') {
      suppressNextSelect.value = false
      return
    }

    clearSuppressReset()
    suppressResetRaf = window.requestAnimationFrame(() => {
      suppressResetRaf = window.requestAnimationFrame(() => {
        suppressNextSelect.value = false
        suppressResetRaf = null
      })
    })
  }

  function getPointerTimestamp(event: PointerEvent) {
    if (Number.isFinite(event.timeStamp))
      return event.timeStamp

    return typeof performance !== 'undefined' ? performance.now() : Date.now()
  }

  function getMaxScrollLeft(target: HTMLElement) {
    return Math.max(0, target.scrollWidth - target.clientWidth)
  }

  function clampVelocity(value: number) {
    return Math.min(inertiaMaxVelocity, Math.max(-inertiaMaxVelocity, value))
  }

  function resetVelocitySample(target: HTMLElement | null = null, event: PointerEvent | null = null) {
    momentumState.lastSampleX = event?.clientX ?? 0
    momentumState.lastSampleTs = event ? getPointerTimestamp(event) : 0
    momentumState.lastSampleScrollLeft = target?.scrollLeft ?? 0

    if (!momentumState.isMomentumActive)
      momentumState.momentumVelocity = 0
  }

  function stopMomentum() {
    if (typeof window !== 'undefined' && momentumState.momentumRaf !== null)
      window.cancelAnimationFrame(momentumState.momentumRaf)

    momentumState.momentumRaf = null
    momentumState.momentumVelocity = 0
    momentumState.isMomentumActive = false
  }

  function startMomentum(target: HTMLElement, initialVelocity: number) {
    if (typeof window === 'undefined')
      return

    const maxScrollLeft = getMaxScrollLeft(target)
    if (maxScrollLeft <= 0)
      return

    const launchVelocity = clampVelocity(initialVelocity)
    if (Math.abs(launchVelocity) < inertiaLaunchVelocity)
      return

    stopMomentum()
    momentumState.isMomentumActive = true
    momentumState.momentumVelocity = launchVelocity

    let lastFrameTs: number | null = null

    const step = (frameTs: number) => {
      if (!momentumState.isMomentumActive || !target.isConnected) {
        stopMomentum()
        return
      }

      const frameDelta = lastFrameTs === null ? inertiaFrameMs : Math.max(frameTs - lastFrameTs, 0)
      lastFrameTs = frameTs

      if (frameDelta <= 0) {
        momentumState.momentumRaf = window.requestAnimationFrame(step)
        return
      }

      const currentMaxScrollLeft = getMaxScrollLeft(target)
      if (currentMaxScrollLeft <= 0) {
        stopMomentum()
        return
      }

      const previousScrollLeft = target.scrollLeft
      const projectedScrollLeft = previousScrollLeft + momentumState.momentumVelocity * frameDelta
      const nextScrollLeft = Math.min(currentMaxScrollLeft, Math.max(0, projectedScrollLeft))
      target.scrollLeft = nextScrollLeft

      const appliedDelta = target.scrollLeft - previousScrollLeft
      const normalizedDecay = inertiaDecay ** (frameDelta / inertiaFrameMs)
      momentumState.momentumVelocity = clampVelocity(momentumState.momentumVelocity * normalizedDecay)

      const reachedBoundary = target.scrollLeft <= 0 || target.scrollLeft >= currentMaxScrollLeft
      const velocityTooLow = Math.abs(momentumState.momentumVelocity) < inertiaStopVelocity
      const noEffectiveMovement = Math.abs(appliedDelta) < 0.01

      if (reachedBoundary || velocityTooLow || noEffectiveMovement) {
        stopMomentum()
        return
      }

      momentumState.momentumRaf = window.requestAnimationFrame(step)
    }

    momentumState.momentumRaf = window.requestAnimationFrame(step)
  }

  function updateVelocitySample(target: HTMLElement, event: PointerEvent) {
    const sampleTimestamp = getPointerTimestamp(event)
    momentumState.lastSampleX = event.clientX

    if (momentumState.lastSampleTs === 0) {
      momentumState.lastSampleTs = sampleTimestamp
      momentumState.lastSampleScrollLeft = target.scrollLeft
      return
    }

    const sampleDt = sampleTimestamp - momentumState.lastSampleTs
    if (sampleDt < inertiaSampleMinDt)
      return

    momentumState.lastSampleTs = sampleTimestamp
    const scrollDelta = target.scrollLeft - momentumState.lastSampleScrollLeft
    momentumState.lastSampleScrollLeft = target.scrollLeft

    if (Math.abs(scrollDelta) < 0.5)
      return

    const sampledVelocity = clampVelocity(scrollDelta / sampleDt)
    if (momentumState.momentumVelocity === 0) {
      momentumState.momentumVelocity = sampledVelocity
      return
    }

    momentumState.momentumVelocity = clampVelocity(
      momentumState.momentumVelocity * (1 - inertiaVelocityBlend)
      + sampledVelocity * inertiaVelocityBlend,
    )
  }

  function releasePointerState(target: HTMLElement | null) {
    const pointerId = pointerState.pointerId
    const wasDragging = isDragging.value

    pointerState.pointerId = null
    pointerState.startX = 0
    pointerState.startY = 0
    pointerState.startScrollLeft = 0
    isDragging.value = false
    resetVelocitySample(target)

    if (target && pointerId !== null && target.hasPointerCapture(pointerId))
      target.releasePointerCapture(pointerId)

    if (wasDragging && suppressNextSelect.value)
      scheduleSuppressReset()
  }

  function completePointerInteraction(target: HTMLElement | null) {
    const launchVelocity = isDragging.value ? momentumState.momentumVelocity : 0
    const shouldLaunchMomentum = Boolean(
      target
      && isDragging.value
      && !prefersReducedMotion.value
      && Math.abs(launchVelocity) >= inertiaLaunchVelocity,
    )

    releasePointerState(target)

    if (target && shouldLaunchMomentum) {
      startMomentum(target, launchVelocity)
      return
    }

    if (!momentumState.isMomentumActive)
      momentumState.momentumVelocity = 0
  }

  function consumeSuppressedSelect() {
    if (!suppressNextSelect.value)
      return false

    suppressNextSelect.value = false
    clearSuppressReset()
    return true
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || !['mouse', 'pen'].includes(event.pointerType))
      return

    const target = event.currentTarget as HTMLElement | null
    if (!target)
      return

    stopMomentum()
    clearSuppressReset()
    pointerState.pointerId = event.pointerId
    pointerState.startX = event.clientX
    pointerState.startY = event.clientY
    pointerState.startScrollLeft = target.scrollLeft
    isDragging.value = false
    resetVelocitySample(target, event)
  }

  function handlePointerMove(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement | null
    if (!target || pointerState.pointerId !== event.pointerId)
      return

    const deltaX = event.clientX - pointerState.startX
    const deltaY = event.clientY - pointerState.startY
    const horizontalDistance = Math.abs(deltaX)
    const verticalDistance = Math.abs(deltaY)

    if (!isDragging.value) {
      if (horizontalDistance < dragThreshold || horizontalDistance <= verticalDistance)
        return

      isDragging.value = true
      suppressNextSelect.value = true
      clearSuppressReset()

      if (!target.hasPointerCapture(event.pointerId))
        target.setPointerCapture(event.pointerId)
    }

    event.preventDefault()
    target.scrollLeft = pointerState.startScrollLeft - deltaX
    updateVelocitySample(target, event)
  }

  function handlePointerUp(event: PointerEvent) {
    completePointerInteraction(event.currentTarget as HTMLElement | null)
  }

  function handlePointerCancel(event: PointerEvent) {
    completePointerInteraction(event.currentTarget as HTMLElement | null)
  }

  function handleLostPointerCapture(event: PointerEvent) {
    completePointerInteraction(event.currentTarget as HTMLElement | null)
  }

  function handleWheel() {
    if (momentumState.isMomentumActive)
      stopMomentum()
  }

  function cleanup() {
    stopMomentum()
    clearSuppressReset()
    suppressNextSelect.value = false
    pointerState.pointerId = null
    pointerState.startX = 0
    pointerState.startY = 0
    pointerState.startScrollLeft = 0
    isDragging.value = false
    resetVelocitySample()
  }

  return {
    isDragging,
    consumeSuppressedSelect,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handleWheel,
    stopMomentum,
    cleanup,
  }
}
