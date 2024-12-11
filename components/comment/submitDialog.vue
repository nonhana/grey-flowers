<script setup lang="ts">
import { useStore } from '~/store'
import type { CommentItem, IPostComment, IReplyComment } from '~/types/comment'

const props = defineProps<{
  replyTo: IReplyComment | null
}>()

const emits = defineEmits<{
  (e: 'published', value: CommentItem): void
}>()

const route = useRoute()
const { path } = route

const { userStore } = useStore()
const { callHanaMessage } = useMessage()

const { userInfo } = toRefs(userStore)

const visible = defineModel<boolean>()

const { replyTo } = toRefs(props)
const dialogTitle = computed(() => replyTo.value ? `回复 ${replyTo.value.username} ：` : '评论')
const inputPlaceholder = computed(() => replyTo.value ? '想和 ta 讨论什么呢？' : '你有什么想说的呢？')

const content = ref('')

const publishing = ref(false)
const buttonText = computed(() => publishing.value ? '发布中...' : '发表评论')

async function handlePublish() {
  if (!content.value) {
    callHanaMessage({
      message: '请填写评论内容。',
      type: 'error',
    })
    return
  }
  const objData: IPostComment = {
    path,
    content: content.value,
  }
  if (replyTo.value) {
    objData.parentId = replyTo.value.parentId
    if (replyTo.value.targetCommentLevel === 'CHILD') {
      objData.replyToUserId = replyTo.value.userId
      objData.replyToCommentId = replyTo.value.commentId
    }
  }
  publishing.value = true
  await publishComment(objData)
  publishing.value = false
}

async function publishComment(objData: IPostComment) {
  const data = await $fetch('/api/comments/post', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    method: 'POST',
    body: JSON.stringify(objData),
  })
  if (data.success) {
    emits('published', data.payload!)
    content.value = ''
    visible.value = false
    callHanaMessage({
      type: 'success',
      message: '发布成功',
    })
  }
  else {
    const errorList = data.error?.map(item => item.message).join(', ')
    callHanaMessage({
      type: 'error',
      message: errorList || data.statusMessage || '发布失败',
    })
  }
}
</script>

<template>
  <HanaDialog v-model="visible" :title="dialogTitle" width="700px">
    <div v-if="replyTo" class="mb-5 rounded-lg border-l-4 border-solid border-primary-400 bg-primary-100 py-2 pl-4 text-text">
      <span class="line-clamp-2">{{ replyTo.content }}</span>
    </div>
    <div class="mb-5 flex items-center gap-2">
      <div class="flex flex-col items-center gap-2">
        <NuxtImg v-if="userInfo!.avatar" :src="userInfo!.avatar" width="40" height="40" class="cursor-pointer rounded-full" />
        <div v-else class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-hana-blue text-xl text-white">
          <span>{{ userInfo!.username[0] }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="font-bold text-black">{{ userInfo!.username }}</span>
        <span class="text-sm text-text">@{{ userInfo!.email }}</span>
      </div>
    </div>
    <div class="mb-5 flex flex-col gap-4">
      <HanaInput v-model="content" type="textarea" :placeholder="inputPlaceholder" resize="none" :rows="8" />
    </div>
    <div class="flex flex-col gap-4">
      <HanaButton class="w-full" dark-mode :disabled="publishing" @click="handlePublish">
        {{ buttonText }}
      </HanaButton>
    </div>
  </HanaDialog>
</template>
