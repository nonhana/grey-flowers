import { createVNode, render } from 'vue'
import Dialog from './index.vue'

// 声明式调用 Dialog 的选项
// 如 <HanaDialog ... />
interface DialogDeclarativeOptions {
  title?: string
  overlayOpacity?: number
  hideHeader?: boolean
  width?: string
  height?: string
  modelValue?: boolean
}

// 编程式调用 Dialog 的选项
// 如 HanaDialog({ ... })
interface DialogProgrammaticOptions {
  title?: string
  content?: string
  showOkButton?: boolean
  showCancelButton?: boolean
  okText?: string
  cancelText?: string
  onOk?: () => void
  onCancel?: () => void
}

export type DialogOptions = DialogDeclarativeOptions & DialogProgrammaticOptions & { programmatic?: boolean }

export default function useDialog() {
  const HanaDialog = (options: DialogOptions) => {
    if (typeof window === 'undefined') {
      return
    }

    const container = document.createElement('div')
    document.appendChild(container)

    const dialogVNode = createVNode(Dialog, {
      ...options,
      'programmatic': true,
      'modelValue': true,
      'onDestroy': () => {
        render(null, container) // 1. 把 Dialog 组件从 container 中移除
        document.removeChild(container) // 2. 把 container 从 document.body 中移除
      },
      'onOk': () => {
        options.onOk?.()
        render(null, container)
        document.removeChild(container)
      },
      'onCancel': () => {
        options.onCancel?.()
        render(null, container)
        document.removeChild(container)
      },
      'onUpdate:modelValue': (value: boolean) => {
        if (!value) {
          render(null, container)
          document.removeChild(container)
        }
      },
    })

    render(dialogVNode, container)
  }

  return { HanaDialog }
}
