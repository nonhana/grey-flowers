import type { ComponentPublicInstance } from 'vue'
import { createVNode, render } from 'vue'
import Container from './Container.vue'

export interface MessageOptions {
  message?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  timeout?: number
}

type ContainerInstance = ComponentPublicInstance<{
  addMessage: (options: MessageOptions) => void
}>

let containerInstance: ContainerInstance | null = null

export default function useMessage() {
  const callHanaMessage = (options: MessageOptions) => {
    if (!containerInstance) {
      const container = document.createElement('div')
      document.body.appendChild(container)

      const messageContainerVNode = createVNode(Container)
      render(messageContainerVNode, container)

      containerInstance = messageContainerVNode.component?.exposed as ContainerInstance
    }

    containerInstance.addMessage(options)
  }

  return { callHanaMessage }
}
