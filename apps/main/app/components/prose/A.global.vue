<script setup lang="ts">
withDefaults(defineProps<{
  href?: string
  target?: '_blank' | '_parent' | '_self' | '_top' | (string & object) | null | undefined
}>(), {
  href: '',
  target: '_blank',
})
</script>

<template>
  <NuxtLink
    :href="href"
    :aria-label="`外部链接：${href}`"
    :target="target"
    class="with-underline text-hana-blue after:mx-1 dark:text-hana-blue-200 after:font-mono after:opacity-50 after:content-['↗']"
    style="word-break: break-word"
  >
    <slot />
  </NuxtLink>
</template>
