import type { SimpleUserInfo } from '~/types/user'

export const tailwindBreakpoints = {
  'sm': '(min-width: 640px)',
  'md': '(min-width: 768px)',
  'lg': '(min-width: 1024px)',
  'xl': '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
}

export const hanaInfo: SimpleUserInfo = {
  id: 1,
  username: 'non_hana',
  site: 'https://www.greyflowers.moe',
  avatar: '/images/avatar.webp',
}
