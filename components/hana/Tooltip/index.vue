<script setup lang="ts">
const props = withDefaults(defineProps<{
  content?: string
  showArrow?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  offset?: 'start' | 'center' | 'end'
  trigger?: 'hover' | 'click'
  animation?: 'fade' | 'slide'
}>(), {
  content: '',
  showArrow: true,
  position: 'bottom',
  offset: 'center',
  trigger: 'hover',
  animation: 'fade',
})
const { trigger } = toRefs(props)
const visible = ref(false)
const hoverTrigger = ref(trigger.value === 'hover')
const clickTrigger = ref(trigger.value === 'click')

function toggleVisible(value: boolean) {
  visible.value = value
}
function open() {
  toggleVisible(true)
}
function close() {
  toggleVisible(false)
}

const triggerRef = ref<HTMLDivElement | null>(null)
const triggerWidth = ref(0)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
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
  <div>
    <div v-click-outside="() => close()" class="relative">
      <div
        ref="triggerRef"
        class="inline-block"
        @[clickTrigger?`click`:null]="toggleVisible(!visible)"
        @[hoverTrigger?`mouseenter`:null]="open()"
        @[hoverTrigger?`mouseleave`:null]="close()"
      >
        <slot v-if="$slots.default" />
      </div>

      <HanaTooltipAnime :animation="animation" :position="position">
        <div
          v-show="visible"
          class="absolute"
          :style="offsetStyle"
          :class="positionClass"
          @[hoverTrigger?`mouseenter`:null]="open()"
          @[hoverTrigger?`mouseleave`:null]="close()"
        >
          <div
            class="relative min-w-max max-w-60 rounded-lg border border-gray-200 bg-white text-center shadow-md"
            :class="[content ? 'px-4 py-2' : 'p-1']"
          >
            <slot name="content" :close="close">
              <span class="text-text">{{ content }}</span>
            </slot>
            <HanaTooltipArrow v-if="showArrow" :position="position" />
          </div>
        </div>
      </HanaTooltipAnime>
    </div>
  </div>
</template>
