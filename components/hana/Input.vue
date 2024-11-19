<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'text' | 'textarea' | 'password'
  placeholder?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  rows?: number
  shape?: 'rounded' | 'sharp'
  prefixIcon?: string
  suffixIcon?: string
}>(), {
  type: 'text',
  placeholder: '',
  resize: 'vertical',
  rows: 5,
  shape: 'sharp',
})

const emits = defineEmits<{
  (e: 'keydown', event: KeyboardEvent): void
}>()

const value = defineModel<string>()

const hovering = ref(false)

function handleMouseEnter() {
  hovering.value = true
}

function handleMouseLeave() {
  hovering.value = false
}

function handleKeyDown(event: KeyboardEvent) {
  emits('keydown', event)
}
</script>

<template>
  <div
    class="relative w-full p-1"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 输入框 -->
    <template v-if="type !== 'textarea'">
      <div class="relative w-full">
        <!-- prefix slot or Icon -->
        <span
          v-if="prefixIcon || $slots.prefix"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          <slot name="prefix" />
          <Icon v-if="prefixIcon" :name="prefixIcon" size="20" />
        </span>
        <!-- input -->
        <input
          v-model="value"
          :type="type"
          class="w-full border-none bg-hana-blue-50 py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-hana-blue-400"
          :class="shape === 'rounded' ? 'rounded-full' : 'rounded-lg'"
          :placeholder="placeholder"
          @keydown="handleKeyDown"
        >
        <!-- suffix slot or Icon -->
        <span
          v-if="suffixIcon || $slots.suffix"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          <slot name="suffix" />
          <Icon v-if="suffixIcon" :name="suffixIcon" size="20" />
        </span>
      </div>
    </template>

    <!-- 文本区域 -->
    <template v-else>
      <textarea
        v-model="value"
        class="w-full border-none bg-hana-blue-50 px-3 py-2 text-sm focus:ring-2 focus:ring-hana-blue-400"
        :style="{ resize }"
        :placeholder="placeholder"
        :rows="rows"
        :class="shape === 'rounded' ? 'rounded-lg' : ''"
        @keydown="handleKeyDown"
      />
    </template>
  </div>
</template>
