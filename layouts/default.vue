<template>
  <div class="wrapper min-h-screen font-noto">
    <header class="sticky top-0 w-full">
      <MainHeader />
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.wrapper {
  background-image: url('../public/images/ende_nea.webp');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
}
</style>
