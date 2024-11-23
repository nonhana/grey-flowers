import { createVNode, render } from 'vue'
import Message from './index.vue'

export interface MessageOptions {
  message?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  position?: 'top' | 'bottom'
  timeout?: number
  [key: string]: any
}

export default function useMessage() {
  const open = (options: MessageOptions) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const messageVNode = createVNode(Message, {
      ...options,
      onDestroy: () => {
        render(null, container)
        document.body.removeChild(container)
      },
    })

    render(messageVNode, container)
  }

  return { open }
}
