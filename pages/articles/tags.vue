<script setup lang="ts">
import { tagList } from '~/test/data'
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-5">
      <HanaTagCard v-for="tag in tagList" :key="tag.id" v-bind="tag" />
    </div>
  </div>
</template>
