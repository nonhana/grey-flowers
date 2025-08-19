import { createVNode, render } from 'vue'
import Dialog from '~/components/hana/Dialog.vue'

// 基础 Dialog 配置
interface BaseDialogOptions {
  title?: string
  width?: string
  height?: string
  overlayOpacity?: number
  hideHeader?: boolean
}

// 声明式调用 Dialog 的选项
interface DialogDeclarativeOptions extends BaseDialogOptions {
  modelValue?: boolean
}

// 编程式调用 Dialog 的选项
interface DialogProgrammaticOptions extends BaseDialogOptions {
  content?: string
  showOkButton?: boolean
  showCancelButton?: boolean
  okText?: string
  cancelText?: string
  onOk?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
  closable?: boolean // 是否可以通过遮罩层/ESC键关闭
}

export type DialogOptions
  = | ({ programmatic: true } & DialogProgrammaticOptions)
    | ({ programmatic: false } & DialogDeclarativeOptions)
    | ({ programmatic?: undefined } & DialogDeclarativeOptions)

export default function useDialog() {
  const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'

  const callHanaDialog = (options: DialogProgrammaticOptions): Promise<'ok' | 'cancel'> => {
    return new Promise((resolve, reject) => {
      if (!isClient) {
        if (typeof window !== 'undefined') {
          console.warn('Dialog can only be called on client side')
        }
        reject(new Error('Dialog can only be called on client side'))
        return
      }

      const container = document.createElement('div')
      document.body.appendChild(container)

      const dialogVNode = createVNode(Dialog, {
        ...options,
        programmatic: true,
        onOk: async () => {
          try {
            await options.onOk?.()
            resolve('ok')
          }
          catch (error) {
            reject(error)
          }
          finally {
            dialogVNode.component?.exposed?.handleClose()
          }
        },
        onCancel: async () => {
          try {
            await options.onCancel?.()
            resolve('cancel')
          }
          catch (error) {
            reject(error)
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
    })
  }

  const confirm = (title: string, content: string, options?: Partial<DialogProgrammaticOptions>) => {
    return callHanaDialog({
      title,
      content,
      showOkButton: true,
      showCancelButton: true,
      okText: '确定',
      cancelText: '取消',
      ...options,
    })
  }

  const alert = (title: string, content: string, options?: Partial<DialogProgrammaticOptions>) => {
    return callHanaDialog({
      title,
      content,
      showOkButton: true,
      showCancelButton: false,
      okText: '确定',
      ...options,
    })
  }

  const info = (content: string, options?: Partial<DialogProgrammaticOptions>) => {
    return callHanaDialog({
      title: '提示',
      content,
      showOkButton: true,
      showCancelButton: false,
      okText: '确定',
      ...options,
    })
  }

  return { callHanaDialog, confirm, alert, info }
}
