<template>
  <div class="flex flex-col">
    <div class="relative h-[calc(100vh-80px)] w-full">
      <AboutBanner class="relative top-8 lg:top-1/4 lg:translate-y-0" />
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 text-text">
        <Icon class="animate-bounce" size="24" name="lucide:chevron-down" />
      </div>
    </div>
    <div class="relative h-[calc(100vh-48px)]">
      <AboutSlogan class="relative top-1/2 -translate-y-1/2" />
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 text-text">
        <Icon class="animate-bounce" size="24" name="lucide:chevron-down" />
      </div>
    </div>
    <div class="relative my-20">
      <AboutIntro />
    </div>
    <Comment />
  </div>
</template>
