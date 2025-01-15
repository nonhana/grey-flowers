<script setup lang="ts">
import { activityData } from '~/data/mock'

const beforeClasses = 'before:absolute before:inset-y-0 before:-left-8 before:h-full before:w-0.5 before:bg-hana-blue before:content-[\'\'] dark:before:bg-hana-blue-200'

const afterClasses = 'after:absolute after:left-[calc(-2rem-5px)] after:top-1/2 after:size-3 after:rounded-full after:bg-hana-blue after:content-[\'\'] dark:after:bg-hana-blue-200'
</script>

<template>
  <ul class="relative m-auto flex max-w-screen-lg flex-col pl-8">
    <li
      v-for="(item, index) in activityData"
      :key="item.id"
      class="relative py-4 first:pt-0 last:pb-0"
      :class="[beforeClasses, afterClasses]"
    >
      <RecentlyItem :item="item" :index="index" />
    </li>
  </ul>
</template>
