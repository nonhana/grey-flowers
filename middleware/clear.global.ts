export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.client) {
    const coverDOM = document.getElementById('cover-clone')
    if (coverDOM) {
      coverDOM.remove()
    }
  }
})
