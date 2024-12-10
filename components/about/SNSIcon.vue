<script setup lang="ts">
import type { SNSItem } from '~/types/about'

defineProps<SNSItem>()
</script>

<template>
  <HanaTooltip :content="name">
    <NuxtLink :to="to" target="_blank" class="grid size-9 place-items-center rounded-full" :style="{ backgroundColor: bgColor }">
      <AboutSNSSvg :icon="icon" :color="iconColor" />
    </NuxtLink>
  </HanaTooltip>
</template>
