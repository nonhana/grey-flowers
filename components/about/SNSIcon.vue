<script setup lang="ts">
import type { SNSItem } from '~/types/about'

defineProps<SNSItem>()
</script>

<template>
  <HanaTooltip :content="name" animation="slide">
    <NuxtLink :to="to" :aria-label="`SNS: ${name}`" target="_blank" class="grid size-9 place-items-center rounded-full" :style="{ backgroundColor: bgColor }">
      <AboutSNSSvg :icon="icon" :color="iconColor" />
    </NuxtLink>
  </HanaTooltip>
</template>
