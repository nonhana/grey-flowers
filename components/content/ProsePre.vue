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

const codeBlockVisibleRows = 12 // 超过 12 行代码就会折叠

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
    class="relative text-clip border-2 border-primary-400 rounded-lg bg-primary-100 text-sm dark:border-hana-black-200 dark:bg-hana-black"
  >
    <figcaption
      class="sticky z-10 flex items-center justify-between gap-4 px-4 pt-2 text-text transition-all dark:text-hana-white-700"
      :class="[headerStatusStore.hidden ? 'top-2' : 'top-14']"
    >
      <div class="flex items-center gap-2">
        <span v-if="language">{{ language }}</span>
        <Icon v-if="filename" class="text-text hidden md:block dark:text-hana-white-700" name="lucide:arrow-right" />
        <span v-if="filename" class="items-center border-2 border-solid px-1 hidden md:flex">
          <Icon class="text-text dark:text-hana-white-700" name="lucide:file-terminal" />
          {{ filename }}
        </span>
      </div>
      <button ref="copyBtnRef" class="cursor-pointer">
        <span>copy</span>
      </button>
    </figcaption>
    <pre
      ref="codeblockRef"
      class="overflow-auto px-4 py-2 font-code scrollbar-none"
      :class="[props.class, { 'animate-none overflow-hidden': isCollapsed }]"
      :style="{ maxHeight: isCollapsed ? collapsibleHeight : 'none' }"
    ><slot /></pre>
    <button
      v-if="collapsible"
      class="absolute bottom-0 h-10 w-full flex items-center justify-center rounded-lg text-text/40 transition-colors from-[#ffffff00] to-[#ffffff] bg-gradient-to-b dark:text-hana-white-700/40 hover:text-text dark:from-[#3d3d3d00] dark:to-[#3d3d3d] dark:hover:dark:text-hana-white-700"
      :class="{ 'bg-none': !isCollapsed }"
      @click="toggleCollapsed()"
    >
      <Icon class="animate-bounce" size="20" :name="collapsedIcon" />
    </button>
  </figure>
</template>
