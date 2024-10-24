<script setup lang="ts">
import { articleList } from '~/test/data'
</script>

<template>
  <div>
    <div class="flex flex-col gap-5">
      <HanaArticleCard v-for="card in articleList" :key="card.id" type="detail" v-bind="card" />
    </div>
  </div>
</template>
