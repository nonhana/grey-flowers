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
  <MainBody />
</template>
