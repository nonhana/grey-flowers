<script setup lang="ts">
const { t, locale } = useI18n()

useHead({
  title: t('head.name'),
  htmlAttrs: {
    lang: locale.value,
  },
  meta: [
    {
      name: 'description',
      content: t('head.description'),
    },
    {
      name: 'keywords',
      content: t('head.keywords'),
    },
  ],
})
</script>

<template>
  <div>
    <p>这是首页</p>
    <div class="flex gap-4">
      <HanaTooltip trigger="click" content="这是一个提示" position="right" animation="slide">
        <HanaButton text="提示" />
      </HanaTooltip>
    </div>
  </div>
</template>
