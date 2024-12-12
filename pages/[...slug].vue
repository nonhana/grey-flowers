<script setup lang="ts">
useHead({
  title: '404',
  meta: [
    {
      name: 'description',
      content: 'Page not found',
    },
  ],
})
</script>

<template>
  <div class="size-full">
    <div class="m-auto mt-8 flex w-fit flex-col items-center gap-8">
      <NuxtImg class="rounded-lg" src="/images/not-found.webp" />
      <p class="text-xl">
        404：找不到当前文章 & 页面哦
      </p>
      <strong class="text-xl">
        如有错误，请及时联系我，非常感谢！
      </strong>
      <div class="hana-card">
        <HanaButton to="/" aria-label="返回首页" shape="square">
          点击返回首页
        </HanaButton>
      </div>
    </div>
  </div>
</template>
