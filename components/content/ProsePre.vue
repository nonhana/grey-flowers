<script setup lang="ts">
import { useStore } from '~/store'

const props = withDefaults(defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
  class?: string
}>(), {
  code: '',
  highlights: () => [],
})

const { headerStatusStore } = useStore()

const codeBlockVisibleRows = 16 // 超过 16 行代码就会折叠

const rows = computed(() => props.code.split('\n').length)
const collapsibleHeight = computed(() => `${codeBlockVisibleRows}rem`)
const collapsible = computed(() => rows.value > codeBlockVisibleRows)
const [isCollapsed, toggleCollapsed] = useToggle(collapsible.value)
const collapsedIcon = computed(() => (isCollapsed.value ? 'lucide:chevrons-down' : 'lucide:chevrons-up'))

const copyBtn = useTemplateRef<HTMLButtonElement>('copyBtnRef')
const codeblock = useTemplateRef<HTMLPreElement>('codeblockRef')

useCopy(copyBtn, codeblock)
</script>

<template>
  <figure
    class="relative text-clip rounded-lg border-2 border-primary-400 bg-primary-100 p-2 text-sm"
  >
    <figcaption
      class="sticky z-50 flex items-center justify-between gap-4 px-2 text-text transition-all"
      :class="[headerStatusStore.hidden ? 'top-2' : 'top-14']"
    >
      <div class="flex items-center gap-2">
        <span v-if="language">{{ language }}</span>
        <Icon v-if="filename" class="hidden text-text md:block" name="lucide:arrow-right" />
        <span v-if="filename" class="hidden items-center border-2 border-solid px-1 md:flex">
          <Icon class="text-text" name="lucide:file-terminal" />
          {{ filename }}
        </span>
      </div>
      <button ref="copyBtnRef">
        <span>copy</span>
      </button>
    </figcaption>
    <pre
      ref="codeblockRef"
      class="my-2 overflow-auto px-2 scrollbar-sticky"
      :class="[props.class, { 'animate-none overflow-hidden': isCollapsed }]"
      :style="{ maxHeight: isCollapsed ? collapsibleHeight : 'none' }"
    ><slot /></pre>
    <button
      v-if="collapsible"
      class="w-full rounded-lg p-2 text-text transition-all hover:bg-hana-blue-200"
      @click="toggleCollapsed()"
    >
      <Icon class="animate-bounce" size="16" :name="collapsedIcon" />
    </button>
  </figure>
</template>
