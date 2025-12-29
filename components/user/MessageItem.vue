<script setup lang="ts">
import type { CommentItem } from '~/types/comment'

const props = defineProps<{
  message: CommentItem
}>()

const messageTip = computed(() => props.message.parent ? '回复了你的评论' : '评论了你的文章')

const blockquoteContent = computed(() =>
  props.message.parent
    ? props.message.replyToComment
      ? props.message.replyToComment.content
      : props.message.parent.content
    : '',
)
</script>

<template>
  <div class="relative w-full flex gap-4 border-b border-primary py-4 border-spacing-x-3.5 dark:border-hana-black-200 last:border-none">
    <div class="hidden md:block">
      <HanaAvatar :size="10" :avatar="message.author.avatar" :site="message.author.site" :username="message.author.username" />
    </div>
    <div class="w-full flex flex-col gap-4">
      <div class="h-5 flex items-center gap-2">
        <HanaUsername :avatar="message.author.avatar" :site="message.author.site" :username="message.author.username" />
        <span class="dark:text-hana-white">{{ messageTip }}</span>
      </div>
      <ProseBlockquote v-if="props.message.parent">
        {{ blockquoteContent }}
      </ProseBlockquote>
      <p class="whitespace-pre-wrap break-words text-black leading-6 dark:text-hana-white">
        {{ message.content }}
      </p>
      <div class="h-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span class="text-nowrap text-sm dark:text-hana-white">{{ message.publishedAt }}</span>
        <NuxtLink :to="message.path" class="text-nowrap text-sm text-text font-code transition-colors dark:text-hana-white-700 hover:text-hana-blue dark:hover:text-hana-blue-200">
          {{ message.path }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
