export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) {
    const coverDOM = document.getElementById('cover-clone')
    if (coverDOM) {
      if (!/^\/articles\/\d+$/.test(to.fullPath)) {
        coverDOM.remove()
      }
    }
  }
})
