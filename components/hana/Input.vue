<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'text' | 'textarea'
  placeholder?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  rows?: number
}>(), {
  type: 'text',
  placeholder: '',
  resize: 'vertical',
  rows: 5,
})

const value = defineModel<string>()

const hovering = ref(false)

function handleMouseEnter() {
  hovering.value = true
}

function handleMouseLeave() {
  hovering.value = false
}
</script>

<template>
  <div
    class="w-full"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <template v-if="type === 'text'">
      <input
        v-model="value"
        type="text"
        class="w-full rounded-lg border-none focus:ring-2 focus:ring-hana-blue-400"
        :placeholder="placeholder"
      >
    </template>

    <template v-else>
      <textarea
        v-model="value"
        class="w-full rounded-lg border-none focus:ring-2 focus:ring-hana-blue-400"
        :style="{ resize }"
        :placeholder="placeholder"
        :rows="rows"
      />
    </template>
  </div>
</template>
