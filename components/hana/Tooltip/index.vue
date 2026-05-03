<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'tooltip' | 'dropdown'
  content?: string
  showArrow?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  offset?: 'start' | 'center' | 'end'
  trigger?: 'hover' | 'click' | 'auto'
  animation?: 'fade' | 'slide'
}>(), {
  type: 'tooltip',
  content: '',
  showArrow: false,
  position: 'bottom',
  offset: 'center',
  trigger: 'hover',
  animation: 'fade',
})

const isMounted = ref(false)
const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')

const hideTooltip = computed(() => !canHover.value && props.type !== 'dropdown')

const tooltipRef = useTemplateRef('tooltipRef')

onClickOutside(tooltipRef, close)

const visible = ref(false)
const resolvedTrigger = computed(() => {
  if (props.trigger !== 'auto')
    return props.trigger

  if (!isMounted.value)
    return 'click'

  return canHover.value ? 'hover' : 'click'
})
const hoverTrigger = computed(() => resolvedTrigger.value === 'hover')
const clickTrigger = computed(() => resolvedTrigger.value === 'click')

function toggleVisible(value: boolean) {
  visible.value = value
}
function open() {
  toggleVisible(true)
}
function close() {
  toggleVisible(false)
}

const triggerRef = useTemplateRef('triggerRef')
const triggerWidth = ref(0)
let observer: IntersectionObserver | null = null

onMounted(() => {
  isMounted.value = true
  observer = new IntersectionObserver(([entry]) => {
    if (entry && entry.isIntersecting) {
      triggerWidth.value = entry.boundingClientRect.width
    }
  }, { threshold: 1 })
  if (triggerRef.value) {
    observer.observe(triggerRef.value)
  }
})

onUnmounted(() => {
  if (observer)
    observer.disconnect()
})

const offsetStyle = computed(() => {
  const triggerHalfWidth = `${triggerWidth.value / 2}px`
  return {
    ...((props.position === 'top' || props.position === 'bottom') && props.offset === 'center' && {
      left: '50%',
      transform: 'translateX(-50%)',
    }),
    ...((props.position === 'top' || props.position === 'bottom') && props.offset === 'end' && {
      right: '50%',
      transform: `translateX(${triggerHalfWidth})`,
    }),
    ...((props.position === 'top' || props.position === 'bottom') && props.offset !== 'center' && props.offset !== 'end' && {
      left: '50%',
      transform: `translateX(-${triggerHalfWidth})`,
    }),
    ...(props.position !== 'top' && props.position !== 'bottom' && props.offset === 'center' && {
      top: '50%',
      transform: 'translateY(-50%)',
    }),
    ...(props.position !== 'top' && props.position !== 'bottom' && props.offset === 'end' && {
      bottom: '50%',
      transform: `translateY(${triggerHalfWidth})`,
    }),
    ...(props.position !== 'top' && props.position !== 'bottom' && props.offset !== 'center' && props.offset !== 'end' && {
      top: '50%',
      transform: `translateY(-${triggerHalfWidth})`,
    }),
  }
})

const positionClass = computed(() => {
  switch (props.position) {
    case 'top':
      return `bottom-full transform mb-2`
    case 'bottom':
      return `top-full transform mt-2`
    case 'left':
      return `right-full transform mr-2`
    case 'right':
      return `left-full transform ml-2`
    default:
      return ''
  }
})
</script>

<template>
  <div ref="tooltipRef" class="relative">
    <div
      ref="triggerRef"
      @[clickTrigger?`click`:null]="toggleVisible(!visible)"
      @[hoverTrigger?`mouseenter`:null]="open()"
      @[hoverTrigger?`mouseleave`:null]="close()"
    >
      <slot v-if="$slots.default" />
    </div>

    <HanaTooltipAnime :animation="animation" :position="position">
      <div
        v-show="visible && !hideTooltip"
        class="absolute z-50"
        :style="offsetStyle"
        :class="positionClass"
        @[hoverTrigger?`mouseenter`:null]="open()"
        @[hoverTrigger?`mouseleave`:null]="close()"
      >
        <div
          class="relative max-w-60 min-w-max hana-card text-center"
          :class="[content ? 'px-4! py-2!' : 'p-1!']"
        >
          <slot name="content" :close="close">
            <span class="text-text dark:text-hana-white-700">{{ content }}</span>
          </slot>
          <HanaTooltipArrow v-if="showArrow" :position="position" />
        </div>
      </div>
    </HanaTooltipAnime>
  </div>
</template>
