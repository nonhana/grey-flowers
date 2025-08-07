<script setup lang="ts">
import type { MessageItem } from '~/types/message'
import { useStore } from '~/store'

const props = withDefaults(defineProps<{
  index?: number
  message: MessageItem
}>(), {
  index: 0,
})

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)
const isMe = computed(() => props.message.author.id === userInfo.value?.id)

const opacity = ref(0)
const top = ref('10px')

onMounted(() => {
  floatAnimation(opacity, top)
})
</script>

<template>
  <div
    class="relative max-w-[80%] flex items-start gap-2 md:gap-5"
    :class="{ 'flex-row-reverse self-end': isMe }"
    :style="{ transition: `all 0.2s ${index * 0.1}s`, opacity, transform: `translateY(${top})` }"
  >
    <HanaAvatar :size="10" :avatar="message.author.avatar" :username="message.author.username" :site="message.author.site" />
    <div class="flex flex-col gap-1">
      <div :class="{ 'self-end': isMe }">
        <HanaUsername
          :avatar="message.author.avatar"
          :username="message.author.username"
          :site="message.author.site"
          class="text-sm text-text font-normal dark:text-hana-white-700"
        />
      </div>
      <div v-if="message.parent" class="flex self-end text-text dark:text-hana-white-700">
        <div class="max-w-40 line-clamp-1">
          <span>{{ message.parent.content }}</span>
        </div>
        <Icon name="material-symbols:reply" />
      </div>
      <div
        class="w-fit rounded-lg p-3"
        :class="[isMe ? 'self-end bg-hana-blue-400 text-white' : 'bg-white text-text dark:bg-hana-black dark:text-hana-white-700']"
      >
        <span class="whitespace-pre-wrap">{{ message.content }}</span>
      </div>
      <div class="text-sm text-text dark:text-hana-white-700" :class="{ 'self-end': isMe }">
        <span>{{ message.publishedAt }}</span>
      </div>
    </div>
  </div>
</template>
