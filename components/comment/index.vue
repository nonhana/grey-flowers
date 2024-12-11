<script setup lang="ts">
import { useStore } from '~/store'
import type { CommentItem, IDeleteComment, IReplyComment, ParentCommentItem } from '~/types/comment'
import type { SimpleUserInfo } from '~/types/userInfo'

const { userStore } = useStore()
const { loggedIn } = toRefs(userStore)
const { callHanaMessage } = useMessage()

const route = useRoute()
const { path } = route

const page = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const parentCount = ref(0)
const { data: fetchedTotal } = await useAsyncData(`comments-count-${path}`, () => $fetch('/api/comments/count', {
  query: { path },
}))
if (fetchedTotal.value?.success) {
  totalCount.value = fetchedTotal.value.payload?.totalCount || 0
  parentCount.value = fetchedTotal.value.payload?.parentCount || 0
}

const { data: fetchedCommentList } = await useAsyncData(`comments-${path}`, () => $fetch('/api/comments/list', {
  query: { path, page: page.value, pageSize: pageSize.value },
}), { watch: [page, pageSize] })
const commentList = computed<ParentCommentItem[]>(() => fetchedCommentList.value?.success ? fetchedCommentList.value.payload || [] : [])

const submitDialogVisible = ref(false)
const replyTo = ref<IReplyComment | null>(null)

watch(submitDialogVisible, (newV) => {
  if (!newV) {
    replyTo.value = null
  }
})

function checkBeforeToggleVisible() {
  loggedIn.value ? toggleVisible() : userStore.toggleLoginWindow()
}

function toggleVisible() {
  submitDialogVisible.value = !submitDialogVisible.value
}

function handleReply(value: IReplyComment) {
  replyTo.value = value
  toggleVisible()
}

async function handleDelete(value: IDeleteComment) {
  const data = await $fetch('/api/comments/delete', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    method: 'POST',
    body: JSON.stringify({ commentId: value.id }),
  })
  if (data.success) {
    removeComment(value)
    callHanaMessage({
      type: 'success',
      message: '删除成功',
    })
  }
}

function removeComment(target: IDeleteComment) {
  if (target.level === 'PARENT') {
    const index = commentList.value.findIndex(item => item.id === target.id)
    const childrenLength = commentList.value[index].children?.length || 0
    if (index !== -1) {
      commentList.value.splice(index, 1)
    }
    totalCount.value -= 1 + childrenLength
  }
  else {
    const parent = commentList.value.find(item => item.id === target.parentId)
    if (parent) {
      const index = parent.children!.findIndex(item => item.id === target.id)
      if (index !== -1) {
        parent.children!.splice(index, 1)
      }
      totalCount.value -= 1
    }
  }
}

function handlePublished(comment: CommentItem) {
  if (comment.level === 'PARENT') {
    commentList.value.unshift({ ...comment, children: [] })
  }
  else {
    const parent = commentList.value.find(item => item.id === comment.parentId)
    if (parent) {
      parent.children!.push(comment)
    }
  }
  totalCount.value += 1
}

const activeCommentId = ref<number>()
function handleActivate(id: number | undefined) {
  activeCommentId.value = id
}

const userInfoDialogVisible = ref(false)
const curUserInfo = ref<SimpleUserInfo | null>(null)
function handleShowAuthorInfo(userInfo: SimpleUserInfo) {
  curUserInfo.value = userInfo
  userInfoDialogVisible.value = true
}
watch(userInfoDialogVisible, (newV) => {
  if (!newV) {
    curUserInfo.value = null
  }
})
</script>

<template>
  <div id="comments" class="flex flex-col gap-5">
    <div class="hana-card w-full p-4">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-2xl font-bold text-hana-blue">评论</span>
          <span class="text-xl text-hana-blue-200">{{ totalCount }}</span>
        </div>
        <HanaButton
          icon="lucide:send"
          dark-mode
          shape="square"
          icon-button
          class="group size-10 transition-all hover:w-32"
          @click="checkBeforeToggleVisible"
        >
          <span class="hidden text-nowrap group-hover:block">发表评论</span>
        </HanaButton>
      </header>
      <main>
        <CommentItem
          v-for="comment in commentList"
          :key="comment.id"
          :active-comment-id="activeCommentId"
          :comment="comment"
          @reply="handleReply"
          @delete="handleDelete"
          @activate="handleActivate"
          @show-author-info="handleShowAuthorInfo"
        />
      </main>
    </div>
    <div class="m-auto">
      <HanaPaginator v-model="page" :total="parentCount" :page-size="pageSize" />
    </div>
  </div>
  <CommentSubmitDialog v-model="submitDialogVisible" :reply-to="replyTo" @published="handlePublished" />
  <CommentUserInfoDialog v-model="userInfoDialogVisible" :user-info="curUserInfo" />
</template>
