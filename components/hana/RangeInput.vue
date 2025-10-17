<script lang="ts" setup>
defineProps<{
  id: string
  min: number
  max: number
  step: number
  value: number
  ariaValuemin: number
  ariaValuemax: number
  ariaValuenow: number
  ariaLabel: string
}>()

const emits = defineEmits<{
  (e: 'input', event: Event): void
  (e: 'change', event: Event): void
  (e: 'pointerdown'): void
}>()
</script>

<template>
  <input
    :id="id"
    class="h-2 appearance-none rounded outline-none transition-[box-shadow] duration-200 accent-hana-blue dark:bg-hana-black-700 focus-visible:ring-2 focus-visible:ring-hana-blue-300 dark:accent-hana-blue-300"
    type="range"
    :min="min"
    :max="max"
    :step="step"
    :value="value"
    :aria-valuemin="ariaValuemin"
    :aria-valuemax="ariaValuemax"
    :aria-valuenow="ariaValuenow"
    :aria-label="ariaLabel"
    :style="`--progress: ${value}`"
    @input="emits('input', $event)"
    @change="emits('change', $event)"
    @pointerdown="emits('pointerdown')"
  >
</template>

<style scoped>
input[type="range"] {
  background: linear-gradient(to right,
    oklch(0.5 0.1102 250.04) calc(var(--progress) * 100%),
    oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
  );
}

.dark {
  input[type="range"] {
    background: linear-gradient(to right,
      oklch(0.75 0.0883 226.04) calc(var(--progress) * 100%),
      oklch(0.93 0.0358 205.23) calc(var(--progress) * 100%)
    );
  }
}
</style>
