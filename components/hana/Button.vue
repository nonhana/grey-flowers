<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'common' | 'icon'
    text?: string
    icon?: string
  }>(),
  {
    type: 'common',
    text: '默认按钮',
  },
)

const emits = defineEmits<{
  click: []
}>()
</script>

<template>
  <div
    class="flex shrink-0 cursor-pointer select-none items-center gap-1 rounded-full text-text-0 transition-all hover:bg-primary-200 hover:text-primary-600 focus:ring focus:ring-primary-300 active:scale-95 active:bg-primary-300"
    :class="type === 'common' ? 'px-[10px] py-2' : 'p-2'"
    @click="emits('click')"
  >
    <Icon v-if="icon" :name="icon" size="20" />
    <span v-if="type === 'common'">{{ text }}</span>
  </div>
</template>
