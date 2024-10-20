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

const visibleTimer = ref<NodeJS.Timeout | null>(null)
function toggleVisible(value: boolean) {
  if (value) {
    if (visibleTimer.value) {
      clearTimeout(visibleTimer.value)
      visibleTimer.value = null
    }
    visible.value = value
  }
  else {
    visibleTimer.value = setTimeout(() => {
      visible.value = value
      visibleTimer.value = null
    }, 100)
  }
}

const triggerRef = ref<HTMLDivElement | null>(null)
const triggerWidth = ref(0)

onMounted(() => {
  if (triggerRef.value) {
    triggerWidth.value = triggerRef.value.offsetWidth
  }
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
    <div v-click-outside="() => toggleVisible(false)" class="relative">
      <div
        ref="triggerRef"
        class="inline-block"
        @[clickTrigger?`click`:null]="toggleVisible(!visible)"
        @[hoverTrigger?`mouseenter`:null]="toggleVisible(true)"
        @[hoverTrigger?`mouseleave`:null]="toggleVisible(false)"
      >
        <slot v-if="$slots.default" />
      </div>

      <HanaTooltipAnime :animation="animation" :position="position">
        <div
          v-show="visible"
          class="absolute"
          :style="offsetStyle"
          :class="positionClass"
          @[hoverTrigger?`mouseenter`:null]="toggleVisible(true)"
          @[hoverTrigger?`mouseleave`:null]="toggleVisible(false)"
        >
          <div
            class="relative min-w-max max-w-60 rounded-lg border border-gray-200 bg-white text-center shadow-md"
            :class="[content ? 'px-4 py-2' : 'p-1']"
          >
            <slot name="content">
              <span class="text-text-0">{{ content }}</span>
            </slot>
            <HanaTooltipArrow v-if="showArrow" :position="position" />
          </div>
        </div>
      </HanaTooltipAnime>
    </div>
  </div>
</template>
