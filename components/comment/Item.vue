<script setup lang="ts">
import { useStore } from '~/store'
import type { CommentItem, IDeleteComment, IReplyComment, ParentCommentItem } from '~/types/comment'
import type { SimpleUserInfo } from '~/types/userInfo'

const props = defineProps<{
  comment: CommentItem | ParentCommentItem
  activeCommentId?: number
}>()

const emits = defineEmits<{
  (e: 'reply', value: IReplyComment): void
  (e: 'delete', value: IDeleteComment): void
  (e: 'activate', value: number | undefined): void
  (e: 'showAuthorInfo', value: SimpleUserInfo): void
}>()

const { callHanaDialog } = useDialog()
const { userStore } = useStore()

const { userInfo, loggedIn } = toRefs(userStore)

const isMe = computed(() => userInfo.value?.id === props.comment.author?.id)

const isActive = computed(() => props.activeCommentId === props.comment.id)

// Type Guard
function isParentCommentItem(comment: CommentItem | ParentCommentItem): comment is ParentCommentItem {
  return (comment as ParentCommentItem).children !== undefined
}

function handleReply() {
  const replyToData = {
    userId: props.comment.author!.id,
    username: props.comment.author!.username,
    commentId: props.comment.id,
    content: props.comment.content,
  }
  if (props.comment.level === 'PARENT') {
    emits('reply', { ...replyToData, parentId: props.comment.id, targetCommentLevel: 'PARENT' })
  }
  else {
    emits('reply', { ...replyToData, parentId: props.comment.parentId!, targetCommentLevel: 'CHILD' })
  }
}

function handleDelete() {
  const deleteData = {
    id: props.comment.id,
  }
  if (props.comment.level === 'PARENT') {
    emits('delete', { ...deleteData, level: 'PARENT' })
  }
  else {
    emits('delete', { ...deleteData, level: 'CHILD', parentId: props.comment.parentId! })
  }
}
function confirmDelete() {
  callHanaDialog({
    title: '提示',
    content: '确定要删除这条评论吗？',
    showCancelButton: true,
    onOk: handleDelete,
  })
}

function handleActivate(id: number | undefined) {
  emits('activate', id)
}

function handleShowAuthorInfo() {
  emits('showAuthorInfo', props.comment.author!)
}
</script>

<template>
  <div class="relative flex w-full border-spacing-x-3.5 gap-4 border-b border-primary py-4 last:border-none">
    <div
      class="hidden md:block"
      @click="handleShowAuthorInfo"
    >
      <NuxtImg
        v-if="comment.author!.avatar"
        :src="comment.author!.avatar"
        width="40"
        height="40"
        class="shrink-0 cursor-pointer rounded-full"
      />
      <div
        v-else
        class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-hana-blue text-xl text-white"
      >
        <span>{{ comment.author!.username[0] }}</span>
      </div>
    </div>
    <div class="flex w-full flex-col gap-4 transition-all" :class="{ 'bg-hana-blue-150': isActive }">
      <div class="flex h-5 items-center gap-2">
        <span class="cursor-pointer font-bold text-hana-blue-400" @click="handleShowAuthorInfo">{{ comment.author!.username }}</span>
        <Icon v-if="comment.replyToUser" size="20" name="lucide:chevron-right" />
        <span v-if="comment.replyToUser" class="text-hana-blue-400">{{ comment.replyToUser.username }}</span>
        <div
          v-if="comment.replyToComment"
          @mouseenter="handleActivate(comment.replyToComment.id)"
          @mouseleave="handleActivate(undefined)"
        >
          <HanaButton icon="lucide:map-pin" icon-button />
        </div>
      </div>
      <p class="whitespace-pre-wrap leading-6 text-black">
        {{ comment.content }}
      </p>
      <div class="flex h-6 items-center gap-2">
        <span class="text-sm">{{ comment.publishedAt }}</span>
        <HanaTooltip v-if="loggedIn" content="点击回复">
          <HanaButton
            icon="lucide:reply"
            icon-button
            @click="handleReply"
          />
        </HanaTooltip>
        <HanaTooltip v-if="isMe" content="删除评论">
          <HanaButton
            icon="lucide:x"
            icon-button
            @click="confirmDelete"
          />
        </HanaTooltip>
      </div>
      <div
        v-if="isParentCommentItem(comment) && comment.children?.length"
        class="rounded-lg bg-primary-100 px-4"
      >
        <CommentItem
          v-for="child in comment.children"
          :key="child.id"
          :comment="child"
          :active-comment-id="activeCommentId"
          @reply="emits('reply', $event)"
          @delete="emits('delete', $event)"
          @activate="emits('activate', $event)"
          @show-author-info="emits('showAuthorInfo', $event)"
        />
      </div>
    </div>
  </div>
</template>
