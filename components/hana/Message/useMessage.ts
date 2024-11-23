import { createVNode, render } from 'vue'
import Container from './Container.vue'

export interface MessageOptions {
  message?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  position?: 'top' | 'bottom'
  timeout?: number
  [key: string]: any
}

let containerInstance: any = null

export default function useMessage() {
  const HanaMessage = (options: MessageOptions) => {
    if (!containerInstance) {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const messageContainer = createVNode(Container)
      render(messageContainer, container)
      containerInstance = messageContainer.component?.exposed
    }

    containerInstance?.addMessage(options)
  }

  return { HanaMessage }
}
