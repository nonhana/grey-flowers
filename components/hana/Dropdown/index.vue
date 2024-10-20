<script setup lang="ts">
withDefaults(defineProps<{
  showArrow?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  offset?: 'start' | 'center' | 'end'
  trigger?: 'hover' | 'click'
  animation?: 'fade' | 'slide'
}>(), {
  showArrow: true,
  position: 'bottom',
  offset: 'center',
  trigger: 'hover',
  animation: 'slide',
})
</script>

<template>
  <div>
    <HanaTooltip
      :position="position"
      :offset="offset"
      :trigger="trigger"
      :animation="animation"
      :show-arrow="showArrow"
    >
      <slot v-if="$slots.default" />
      <template #content>
        <div>
          <slot name="dropdown" />
        </div>
      </template>
    </HanaTooltip>
  </div>
</template>
