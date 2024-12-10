<template>
  <div class="flex flex-col">
    <div class="relative h-[calc(100vh-80px)]">
      <AboutBanner class="relative top-1/2 -translate-y-1/2 lg:top-1/4 lg:translate-y-0" />
      <Icon class="absolute bottom-0 left-1/2 -translate-x-1/2 animate-bounce text-text" size="24" name="lucide:chevron-down" />
    </div>
    <div class="relative h-[calc(100vh-48px)]">
      <AboutSlogan class="relative top-1/2 -translate-y-1/2" />
      <Icon class="absolute bottom-0 left-1/2 -translate-x-1/2 animate-bounce text-text" size="24" name="lucide:chevron-down" />
    </div>
    <div class="relative my-20">
      <AboutIntro />
    </div>
  </div>
</template>
