<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string
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

const showPassword = ref(false)

function toggleShowPassword() {
  showPassword.value = !showPassword.value
}

const curType = computed(() => {
  if (props.type === 'textarea') {
    return props.type
  }
  return showPassword.value ? 'text' : props.type
})
</script>

<template>
  <div
    class="relative w-full p-1"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <template v-if="type !== 'textarea'">
      <div class="relative w-full">
        <span
          v-if="prefixIcon || $slots.prefix"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          <slot name="prefix" />
          <Icon v-if="prefixIcon" :name="prefixIcon" size="20" />
        </span>
        <input
          v-model="value"
          :name="name"
          :type="curType"
          class="w-full border-hana-blue-50 bg-hana-blue-50 py-2 pl-10 pr-3 text-sm transition-all focus:border-hana-blue-400 focus:outline-0"
          :class="shape === 'rounded' ? 'rounded-full' : 'rounded-lg'"
          :placeholder="placeholder"
          @keydown="handleKeyDown"
        >
        <span
          v-if="suffixIcon || $slots.suffix || type === 'password'"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          <slot name="suffix" />
          <Icon v-if="suffixIcon && type !== 'password'" :name="suffixIcon" size="20" />
          <Icon
            v-else-if="type === 'password'"
            :name="showPassword ? 'lucide:eye' : 'lucide:eye-off'"
            size="20"
            class="cursor-pointer"
            @click="toggleShowPassword"
          />
        </span>
      </div>
    </template>

    <template v-else>
      <textarea
        v-model="value"
        :name="name"
        class="w-full border-hana-blue-50 bg-hana-blue-50 px-3 py-2 text-sm transition-all focus:border-hana-blue-400 focus:outline-0"
        :class="shape === 'rounded' ? 'rounded-full' : 'rounded-lg'"
        :style="{ resize }"
        :placeholder="placeholder"
        :rows="rows"
        @keydown="handleKeyDown"
      />
    </template>
  </div>
</template>
