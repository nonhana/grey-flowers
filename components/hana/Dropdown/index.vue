<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'hover' | 'click'
}>(), {
  type: 'hover',
})

const visible = ref(false)

function toggleVisible(action: boolean) {
  visible.value = action
}
</script>

<template>
  <div>
    <div v-if="type === 'hover'" @mouseenter="toggleVisible(true)" @mouseleave="toggleVisible(false)">
      <slot />
    </div>
    <div v-else-if="type === 'click'" @mouseenter="visible = !visible" @mouseleave="visible = !visible">
      <slot />
    </div>
    <div :class="{ hidden: !visible }">
      <slot name="dropdown" />
    </div>
  </div>
</template>
