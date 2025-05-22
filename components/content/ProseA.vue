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
    class="text-hana-blue with-underline after:mx-1 after:font-mono after:opacity-50 after:content-['↗'] dark:text-hana-blue-200"
    style="word-break: break-word"
  >
    <slot />
  </NuxtLink>
</template>
