import { createVNode, render } from 'vue'
import Dialog from '~/components/hana/Dialog.vue'

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
// 如 callHanaDialog({ ... })
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
  // 编程式调用 Dialog
  const callHanaDialog = (options: DialogOptions) => {
    // 创建容器
    const container = document.createElement('div')
    document.body.appendChild(container)

    // 挂载 VNode
    const dialogVNode = createVNode(Dialog, {
      ...options,
      programmatic: true,
      onOk: () => {
        try {
          options.onOk?.()
        }
        finally {
          dialogVNode.component?.exposed?.handleClose()
        }
      },
      onCancel: () => {
        try {
          options.onCancel?.()
        }
        finally {
          dialogVNode.component?.exposed?.handleClose()
        }
      },
      onDestroy: () => {
        render(null, container)
        document.body.removeChild(container)
      },
    })

    render(dialogVNode, container)
  }

  return { callHanaDialog }
}
