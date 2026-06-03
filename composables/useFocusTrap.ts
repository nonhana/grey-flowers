import type { ComputedRef, Ref } from 'vue'

const FOCUSABLE_SELECTOR
  = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(
  elRef: Readonly<Ref<HTMLElement | null>>,
  visible: Ref<boolean> | ComputedRef<boolean>,
) {
  const previouslyFocusedElement = ref<HTMLElement | null>(null)

  function getFocusableElements() {
    if (!elRef.value)
      return []

    return Array.from(elRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  function focusInitialElement() {
    const focusTarget = getFocusableElements()[0] ?? elRef.value
    focusTarget?.focus({ preventScroll: true })
  }

  function restoreFocus() {
    if (!previouslyFocusedElement.value)
      return

    if (document.contains(previouslyFocusedElement.value))
      previouslyFocusedElement.value.focus({ preventScroll: true })

    previouslyFocusedElement.value = null
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !elRef.value)
      return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) {
      event.preventDefault()
      elRef.value.focus({ preventScroll: true })
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement

    if (event.shiftKey && (activeElement === firstElement || activeElement === elRef.value)) {
      event.preventDefault()
      lastElement?.focus({ preventScroll: true })
    }
    else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus({ preventScroll: true })
    }
  }

  watch(visible, (isVisible) => {
    if (typeof document === 'undefined')
      return

    if (isVisible) {
      nextTick(() => {
        previouslyFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
        focusInitialElement()
      })
    }
    else {
      nextTick(() => {
        restoreFocus()
      })
    }
  })

  return {
    trapFocus,
  }
}
