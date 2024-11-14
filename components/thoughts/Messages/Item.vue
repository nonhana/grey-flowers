<script setup lang="ts">
import type { MessageItem } from '~/types/message'

defineProps<{
  message: MessageItem
}>()
</script>

<template>
  <div class="relative flex items-start gap-5" :class="{ 'flex-row-reverse self-end': message.isMe }">
    <div class="flex flex-col items-center gap-2">
      <NuxtImg :src="message.author.avatar" class="rounded-full" width="40" height="40" />
      <NuxtLink :to="message.author.site" class="text-text hover:text-hana-blue">
        <span>{{ message.author.name }}</span>
      </NuxtLink>
    </div>
    <div class="flex flex-col gap-1">
      <div v-if="message.replyTo" class="flex self-end text-text">
        <div class="line-clamp-1 max-w-40">
          <span>{{ message.replyTo.content }}</span>
        </div>
        <Icon name="material-symbols:reply" />
      </div>
      <div
        class="rounded-lg p-3"
        :class="[message.isMe ? 'bg-hana-blue-400 text-white' : 'bg-white text-text']"
      >
        <span class="whitespace-pre-wrap">{{ message.content }}</span>
      </div>
      <div class="self-end text-sm text-text">
        <span>{{ message.publishedAt }}</span>
      </div>
    </div>
  </div>
</template>
