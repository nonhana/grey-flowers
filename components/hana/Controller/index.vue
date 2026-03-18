<template>
  <transition-group
    name="controller"
    tag="div"
    class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 transition-all md:bottom-10 md:right-10 md:gap-4"
  >
    <HanaControllerPlayer key="player" />
    <HanaControllerVolume key="volume" />
    <HanaControllerComment key="comment" />
    <HanaControllerScrollTop key="scroll-top" />
    <HanaControllerArticleDrawer key="article-drawer" />
  </transition-group>
</template>

<style scoped lang="scss">
.controller-move,
.controller-enter-active,
.controller-leave-active {
  transition: all 0.3s ease;
}

.controller-enter-from,
.controller-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
