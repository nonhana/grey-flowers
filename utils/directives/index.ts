import type { Directive } from 'vue'
import clickOutside from './clickOutside'
import countDown from './countDown'

export default {
  countDown,
  clickOutside,
} as Record<string, Directive>
