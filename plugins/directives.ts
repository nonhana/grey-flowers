import directives from '~/utils/directives'

export default defineNuxtPlugin((nuxtApp) => {
  for (const key in directives) {
    nuxtApp.vueApp.directive(key, directives[key]!)
  }
})
