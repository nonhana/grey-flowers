import type { CSSProperties } from 'vue'

export function setStyles(el: HTMLElement, styles: CSSProperties) {
  Object.assign(el.style, styles)
}
