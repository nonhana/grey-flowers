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
  // 编程式调用 Dialog 手动管理遮罩层以正确触发过渡效果
  function createOverlay(overlayOpacity: number = 0.5) {
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 z-40 bg-black transition-opacity duration-300'
    overlay.style.opacity = '0'
    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
      overlay.style.opacity = String(overlayOpacity)
    })

    const removeOverlay = () => {
      overlay.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(overlay)
      }, 300)
    }

    overlay.addEventListener('click', () => {
      removeOverlay()
    })
    return { removeOverlay }
  }

  // 编程式调用 Dialog
  const callHanaDialog = (options: DialogOptions) => {
    // 创建容器
    const container = document.createElement('div')
    document.body.appendChild(container)

    // 创建遮罩层
    const { removeOverlay } = createOverlay(options.overlayOpacity)

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
      onRemoveOverlay: removeOverlay,
    })

    render(dialogVNode, container)
  }

  return { callHanaDialog }
}
