<script setup lang="ts">
import { aboutPageData, navbarData } from '~/data'

useHead({
  title: aboutPageData.title,
  meta: [
    {
      name: 'description',
      content: aboutPageData.description,
    },
  ],
})

defineOgImageComponent('About', {
  headline: 'Greetings 👋',
  title: navbarData.homeTitle,
  description: 'Dive into web development with me, and learn JS, TS, Vue, React, etc.',
  link: '/images/avatar.webp',
})
</script>

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
