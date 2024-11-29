import ClipboardJS from 'clipboard'

export default function useCopy(
  trigger: MaybeRefOrGetter<{ $el: Element } | Element | null>,
  target: MaybeRefOrGetter<{ $el: Element } | HTMLInputElement | Element | null>,
  text?: string,
) {
  const { callHanaMessage } = useMessage()
  let clipboard: ClipboardJS
  const getEl = (element: any) => element?.$el ?? element

  onMounted(() => {
    const elTrigger = getEl(toValue(trigger))
    const elTarget = getEl(toValue(target))
    const getText = () => {
      if (text)
        return text
      if (elTarget instanceof HTMLInputElement)
        return elTarget.value
      return elTarget?.textContent as string || ''
    }

    clipboard = new ClipboardJS(elTrigger, { text: getText })
    clipboard.on('success', () => callHanaMessage({ type: 'success', message: '复制成功' }))
    clipboard.on('error', () => callHanaMessage({ type: 'error', message: '复制失败' }))
  })

  onUnmounted(() => {
    clipboard?.destroy()
  })
}
