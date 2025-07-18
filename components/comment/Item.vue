<script setup lang="ts">
import type { CommentItem, IDeleteComment, IReplyComment, ParentCommentItem } from '~/types/comment'
import { useStore } from '~/store'

type Comment = CommentItem | ParentCommentItem

const props = withDefaults(defineProps<{
  comment: Comment
  activeCommentId?: number
  recordMode?: boolean
  isChild?: boolean
}>(), {
  recordMode: false,
  isChild: false,
})

const emits = defineEmits<{
  (e: 'reply', value: IReplyComment): void
  (e: 'delete', value: IDeleteComment): void
  (e: 'activate', value: number | undefined): void
}>()

const { callHanaDialog } = useDialog()
const { userStore } = useStore()

const { userInfo, loggedIn } = toRefs(userStore)

const isMe = computed(() => userInfo.value?.id === props.comment.author?.id)

const isActive = computed(() => props.activeCommentId === props.comment.id)

// Type Guard
function isParentCommentItem(comment: Comment): comment is ParentCommentItem {
  return (comment as ParentCommentItem).children !== undefined
}

function handleReply() {
  const replyToData = {
    userId: props.comment.author.id,
    username: props.comment.author.username,
    commentId: props.comment.id,
    content: props.comment.content,
  }
  if (props.comment.level === 'PARENT') {
    emits('reply', { ...replyToData, parentId: props.comment.id, targetCommentLevel: 'PARENT' })
  }
  else {
    emits('reply', { ...replyToData, parentId: props.comment.parent!.id, targetCommentLevel: 'CHILD' })
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
    emits('delete', { ...deleteData, level: 'CHILD', parentId: props.comment.parent!.id })
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

const isReplyToParentComment = computed(() =>
  props.recordMode
  && props.comment.parent
  && !props.comment.replyToComment)

const isReplyToChildComment = computed(() =>
  props.recordMode
  && props.comment.replyToComment)

const blockquoteContent = computed(() =>
  isReplyToParentComment.value
    ? props.comment.parent!.content
    : props.comment.replyToComment!.content)
</script>

<template>
  <ClientOnly>
    <div class="relative flex w-full border-spacing-x-3.5 gap-4 border-b border-primary py-4 last:border-none dark:border-hana-black-200">
      <div class="hidden md:block">
        <HanaAvatar :size="10" :avatar="comment.author.avatar" :site="comment.author.site" :username="comment.author.username" />
      </div>
      <div class="flex w-full flex-col gap-4 transition-all" :class="{ 'bg-hana-blue-150 dark:bg-hana-black-800': isActive }">
        <div class="flex h-5 items-center gap-2">
          <HanaUsername :avatar="comment.author.avatar" :site="comment.author.site" :username="comment.author.username" />
          <Icon v-if="comment.replyToUser" class="dark:text-hana-white" size="20" name="lucide:chevron-right" />
          <HanaUsername
            v-if="comment.replyToUser"
            :avatar="comment.author.avatar"
            :site="comment.author.site"
            :username="comment.replyToUser.username"
            class="font-normal"
          />
          <div
            v-if="comment.replyToComment && !recordMode"
            @mouseenter="handleActivate(comment.replyToComment.id)"
            @mouseleave="handleActivate(undefined)"
          >
            <HanaButton icon="lucide:map-pin" icon-button />
          </div>
        </div>
        <ProseBlockquote v-if="!isChild && recordMode && (isReplyToParentComment || isReplyToChildComment)">
          {{ blockquoteContent }}
        </ProseBlockquote>
        <p class="whitespace-pre-wrap leading-6 text-black dark:text-hana-white break-words">
          {{ comment.content }}
        </p>
        <div class="flex h-6 items-center gap-2" :class="{ 'overflow-x-auto scrollbar-hidden': recordMode }">
          <span class="text-nowrap text-sm dark:text-hana-white">{{ comment.publishedAt }}</span>
          <NuxtLink v-if="recordMode" :to="comment.path" class="text-nowrap font-code text-sm text-text transition-colors hover:text-hana-blue dark:text-hana-white-700 dark:hover:text-hana-blue-200">
            {{ comment.path }}
          </NuxtLink>
          <HanaTooltip v-if="loggedIn && !recordMode" content="点击回复" animation="slide">
            <HanaButton
              icon="lucide:reply"
              icon-button
              @click="handleReply"
            />
          </HanaTooltip>
          <HanaTooltip v-if="isMe && !recordMode" content="删除评论" animation="slide">
            <HanaButton
              icon="lucide:x"
              icon-button
              @click="confirmDelete"
            />
          </HanaTooltip>
        </div>
        <div
          v-if="isParentCommentItem(comment) && comment.children?.length"
          class="rounded-lg bg-primary-100 px-4 dark:bg-hana-black-600"
        >
          <CommentItem
            v-for="child in comment.children"
            :key="child.id"
            :comment="child"
            :active-comment-id="activeCommentId"
            :record-mode="recordMode"
            is-child
            @reply="emits('reply', $event)"
            @delete="emits('delete', $event)"
            @activate="emits('activate', $event)"
          />
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
