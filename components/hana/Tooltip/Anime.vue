<script setup lang="ts">
const props = defineProps<{
  position: 'top' | 'bottom' | 'left' | 'right'
  animation: 'fade' | 'slide'
}>()

interface Animation {
  enterActiveClass: string
  enterFromClass: string
  enterToClass: string
  leaveActiveClass: string
  leaveFromClass: string
  leaveToClass: string
}
const animateClass = computed<Animation>(() => {
  switch (props.animation) {
    case 'fade':
      return {
        enterActiveClass: 'duration-200 ease-out',
        enterFromClass: 'transform opacity-0',
        enterToClass: 'opacity-100',
        leaveActiveClass: 'duration-200 ease-in',
        leaveFromClass: 'opacity-100',
        leaveToClass: 'transform opacity-0',
      }
    case 'slide':
      return {
        enterActiveClass: 'duration-200 ease-out',
        enterFromClass: `transform opacity-0${props.position === 'top' || props.position === 'bottom' ? ' translate-y-2' : ' translate-x-2'}`,
        enterToClass: 'opacity-100',
        leaveActiveClass: 'duration-200 ease-in',
        leaveFromClass: 'opacity-100',
        leaveToClass: `transform opacity-0${props.position === 'top' || props.position === 'bottom' ? ' translate-y-2' : ' translate-x-2'}`,
      }
    default:
      return {
        enterActiveClass: '',
        enterFromClass: '',
        enterToClass: '',
        leaveActiveClass: '',
        leaveFromClass: '',
        leaveToClass: '',
      }
  }
})
</script>

<template>
  <Transition
    name="hana-tooltip"
    :enter-active-class="animateClass.enterActiveClass"
    :enter-from-class="animateClass.enterFromClass"
    :enter-to-class="animateClass.enterToClass"
    :leave-active-class="animateClass.leaveActiveClass"
    :leave-from-class="animateClass.leaveFromClass"
    :leave-to-class="animateClass.leaveToClass"
  >
    <slot />
  </Transition>
</template>
