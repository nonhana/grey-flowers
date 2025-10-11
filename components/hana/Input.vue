<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string
  type?: 'text' | 'textarea' | 'password' | 'number'
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
  (e: 'input', event: Event): void
}>()

const value = defineModel<string>()

function handleKeyDown(event: KeyboardEvent) {
  emits('keydown', event)
}

function handleInput(event: Event) {
  emits('input', event)
}

const showPassword = ref(false)

function toggleShowPassword() {
  showPassword.value = !showPassword.value
}

const curType = computed(() => {
  if (props.type !== 'text' && props.type !== 'password') {
    return props.type
  }
  return showPassword.value ? 'text' : props.type
})
</script>

<template>
  <div class="relative w-full p-1">
    <template v-if="type !== 'textarea'">
      <div class="relative w-full">
        <span
          v-if="prefixIcon || $slots.prefix"
          class="absolute left-3 top-1/2 text-text -translate-y-1/2 dark:text-hana-white-700"
        >
          <slot name="prefix" />
          <Icon v-if="prefixIcon" :name="prefixIcon" size="20" />
        </span>
        <input
          v-model="value"
          :name="name"
          :type="curType"
          class="w-full border-hana-blue-50 bg-hana-blue-50 py-2 text-sm transition-all dark:border-hana-black-600 focus:border-hana-blue-400 dark:bg-hana-black-600 dark:text-hana-white placeholder:text-text focus:outline-0 dark:focus:border-hana-blue-200 dark:placeholder:text-hana-white-700"
          :class="[
            shape === 'rounded' ? 'rounded-full' : 'rounded-lg',
            prefixIcon || $slots.prefix ? 'pl-10' : 'pl-3',
            suffixIcon || $slots.suffix || type === 'password' ? 'pr-10' : 'pr-3',
          ]"
          :placeholder="placeholder"
          @keydown="handleKeyDown"
          @input="handleInput"
        >
        <span
          v-if="suffixIcon || $slots.suffix || type === 'password'"
          class="absolute right-3 top-1/2 text-text -translate-y-1/2 dark:text-hana-white-700"
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
        class="w-full border-hana-blue-50 bg-hana-blue-50 px-3 py-2 text-sm transition-all dark:border-hana-black-600 focus:border-hana-blue-400 dark:bg-hana-black-600 dark:text-hana-white placeholder:text-text focus:outline-0 dark:focus:border-hana-blue-200 dark:placeholder:text-hana-white-700"
        :class="shape === 'rounded' ? 'rounded-full' : 'rounded-lg'"
        :style="{ resize }"
        :placeholder="placeholder"
        :rows="rows"
        @keydown="handleKeyDown"
      />
    </template>
  </div>
</template>
