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
  <div class="relative flex w-full border-spacing-x-3.5 gap-4 border-b border-primary py-4 last:border-none dark:border-hana-black-200">
    <div class="hidden md:block">
      <HanaAvatar :size="10" :avatar="message.author.avatar" :site="message.author.site" :username="message.author.username" />
    </div>
    <div class="flex w-full flex-col gap-4">
      <div class="flex h-5 items-center gap-2">
        <HanaUsername :avatar="message.author.avatar" :site="message.author.site" :username="message.author.username" />
        <span class="dark:text-hana-white">{{ messageTip }}</span>
      </div>
      <ProseBlockquote v-if="props.message.parent">
        {{ blockquoteContent }}
      </ProseBlockquote>
      <p class="whitespace-pre-wrap leading-6 text-black dark:text-hana-white break-words">
        {{ message.content }}
      </p>
      <span class="h-6 text-nowrap text-sm dark:text-hana-white">{{ message.publishedAt }}</span>
    </div>
  </div>
</template>
