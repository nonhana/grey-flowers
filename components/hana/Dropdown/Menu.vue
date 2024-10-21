<script setup lang="ts">
function handleClick(e: MouseEvent) {

}
</script>

<template>
  <ul class="flex flex-col gap-1" @click="handleClick">
    <slot />
  </ul>
</template>
