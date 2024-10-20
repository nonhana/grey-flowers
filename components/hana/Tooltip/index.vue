<script setup lang="ts">
const props = withDefaults(defineProps<{
  content?: string
  showArrow?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'hover' | 'click'
  animation?: 'fade' | 'slide'
}>(), {
  content: '',
  showArrow: true,
  position: 'bottom',
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

const positionClass = computed(() => {
  switch (props.position) {
    case 'top':
      return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
    case 'bottom':
      return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
    case 'left':
      return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
    case 'right':
      return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    default:
      return ''
  }
})
</script>

<template>
  <div class="relative">
    <div
      @[clickTrigger?`click`:null]="toggleVisible(!visible)"
      @[hoverTrigger?`mouseenter`:null]="toggleVisible(true)"
      @[hoverTrigger?`mouseleave`:null]="toggleVisible(false)"
    >
      <slot v-if="$slots.default" />
    </div>

    <HanaTooltipAnime :animation="animation" :position="position">
      <div
        v-if="visible" v-click-outside="() => toggleVisible(false)" class="absolute"
        :class="positionClass"
        @[hoverTrigger?`mouseenter`:null]="toggleVisible(true)"
        @[hoverTrigger?`mouseleave`:null]="toggleVisible(false)"
      >
        <div class="relative min-w-max max-w-60 rounded-lg border border-gray-200 bg-white px-4 py-2 text-center shadow-md">
          <slot name="content">
            <span class="text-text-0">{{ content }}</span>
          </slot>
          <HanaTooltipArrow v-if="showArrow" :offset="position" />
        </div>
      </div>
    </HanaTooltipAnime>
  </div>
</template>
