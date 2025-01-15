<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

defineProps<{ item: ActivityItem }>()

const visible = defineModel<boolean>()
</script>

<template>
  <HanaDialog v-model="visible" title="动态详情" width="800px">
    <header class="flex items-center gap-2">
      <HanaAvatar :size="10" :avatar="hanaInfo.avatar" :username="hanaInfo.username" :site="hanaInfo.site" :show-info="false" />
      <div class="flex flex-col gap-1">
        <span class="font-bold text-black dark:text-hana-white">{{ hanaInfo.username }}</span>
        <span class="flex items-center space-x-1 text-sm text-text dark:text-hana-white-700">
          <Icon name="lucide:clock" size="14" />
          <time :datetime="item.publishedAt">{{ item.publishedAt }}</time>
        </span>
      </div>
    </header>
    <main class="my-5 text-black dark:text-hana-white">
      <p class="whitespace-pre-wrap leading-6">
        {{ item.content }}
      </p>
    </main>
    <footer class="py-5">
      <Comment />
    </footer>
  </HanaDialog>
</template>
