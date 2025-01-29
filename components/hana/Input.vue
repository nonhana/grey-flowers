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
  <div class="relative w-full p-1">
    <template v-if="type !== 'textarea'">
      <div class="relative w-full">
        <span
          v-if="prefixIcon || $slots.prefix"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-text dark:text-hana-white-700"
        >
          <slot name="prefix" />
          <Icon v-if="prefixIcon" :name="prefixIcon" size="20" />
        </span>
        <input
          v-model="value"
          :name="name"
          :type="curType"
          class="w-full border-hana-blue-50 bg-hana-blue-50 py-2 pl-10 pr-3 text-sm transition-all placeholder:text-text focus:border-hana-blue-400 focus:outline-0 dark:border-hana-black-600 dark:bg-hana-black-600 dark:text-hana-white dark:placeholder:text-hana-white-700 dark:focus:border-hana-blue-200"
          :class="shape === 'rounded' ? 'rounded-full' : 'rounded-lg'"
          :placeholder="placeholder"
          @keydown="handleKeyDown"
        >
        <span
          v-if="suffixIcon || $slots.suffix || type === 'password'"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-text dark:text-hana-white-700"
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
        class="w-full border-hana-blue-50 bg-hana-blue-50 px-3 py-2 text-sm transition-all placeholder:text-text focus:border-hana-blue-400 focus:outline-0 dark:border-hana-black-600 dark:bg-hana-black-600 dark:text-hana-white dark:placeholder:text-hana-white-700 dark:focus:border-hana-blue-200"
        :class="shape === 'rounded' ? 'rounded-full' : 'rounded-lg'"
        :style="{ resize }"
        :placeholder="placeholder"
        :rows="rows"
        @keydown="handleKeyDown"
      />
    </template>
  </div>
</template>
