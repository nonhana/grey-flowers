interface UseDetailContentReadyOptions {
  status: Readonly<Ref<ActivityDetailStatus>>
  hasItem: Readonly<Ref<boolean>>
  requiresMarkdown: Readonly<Ref<boolean>>
  itemKey: Readonly<Ref<number | undefined>>
}

export function useDetailContentReady(options: UseDetailContentReadyOptions) {
  const isMarkdownReady = ref(false)

  watch(options.itemKey, () => {
    isMarkdownReady.value = false
  })

  const isContentReady = computed(() =>
    !options.requiresMarkdown.value || isMarkdownReady.value,
  )

  const shouldShowLoading = computed(() =>
    options.status.value === 'loading'
    || (options.status.value === 'ready' && options.hasItem.value && !isContentReady.value),
  )

  function markMarkdownReady() {
    isMarkdownReady.value = true
  }

  return {
    isContentReady,
    shouldShowLoading,
    markMarkdownReady,
  }
}
