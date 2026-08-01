<script setup lang="ts">
import type { CommentItem } from '#shared/types/comment'

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
    <div class="shrink-0 hidden md:block">
      <HanaAvatar :size="10" :avatar="message.author.avatar" :site="message.author.site" :username="message.author.username" />
    </div>
    <div class="min-w-0 flex flex-1 flex-col gap-4">
      <div class="h-5 flex items-center gap-2">
        <HanaUsername :avatar="message.author.avatar" :site="message.author.site" :username="message.author.username" />
        <span class="dark:text-hana-white">{{ messageTip }}</span>
      </div>
      <ProseBlockquote v-if="props.message.parent">
        {{ blockquoteContent }}
      </ProseBlockquote>
      <MarkdownRenderer
        :value="message.contentMarkdown"
        class="custom-markdown break-words text-black dark:text-hana-white"
      >
        <template #empty>
          <p class="m-0 whitespace-pre-wrap break-words leading-normal">
            {{ message.content }}
          </p>
        </template>
      </MarkdownRenderer>
      <div class="h-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span class="text-nowrap text-sm dark:text-hana-white">{{ message.publishedAt }}</span>
        <NuxtLink :to="message.path" class="text-nowrap text-sm text-text font-code transition-colors dark:text-hana-white-700 hover:text-hana-blue dark:hover:text-hana-blue-200">
          {{ message.path }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
