<script setup lang="ts">
import type { CommentItem, IDeleteComment, IReplyComment, ParentCommentItem } from '~/types/comment'
import { useStore } from '~/store'

const props = withDefaults(defineProps<{
  type?: 'default' | 'recently'
  path?: string
}>(), {
  type: 'default',
})

const isRecently = computed(() => props.type === 'recently')

const { userStore } = useStore()
const { loggedIn } = toRefs(userStore)
const { callHanaMessage } = useMessage()

const route = useRoute()
const { fullPath, path, hash } = route

const queryPath = computed(() => props.path ? props.path : isRecently.value ? fullPath : path)

const page = ref(1)
const pageSize = ref(10)

const totalCount = ref(0)
const parentCount = ref(0)
const commentList = ref<ParentCommentItem[]>([])

async function fetchTotal() {
  const data = await $fetch('/api/comments/count', {
    query: { path: queryPath.value },
  })
  if (data.success) {
    totalCount.value = data.payload?.totalCount || 0
    parentCount.value = data.payload?.parentCount || 0
  }
}

async function fetchComments() {
  const data = await $fetch('/api/comments/list', {
    query: { path: queryPath.value, page: page.value, pageSize: pageSize.value },
  })
  if (data.success) {
    commentList.value = (data.payload as ParentCommentItem[]) ?? []
  }
}

onMounted(() => {
  fetchTotal()
  fetchComments()
})

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
    const childrenLength = commentList.value[index]?.children?.length || 0
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
    const parent = commentList.value.find(item => item.id === comment.parent?.id)
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

watch(() => hash, (newV) => {
  if (newV === '#comments') {
    setTimeout(() => {
      const comments = document.getElementById('comments')
      if (comments) {
        comments.scrollIntoView({ behavior: 'smooth' })
      }
    }, 1000)
  }
}, { immediate: true })
</script>

<template>
  <div id="comments" class="flex flex-col gap-5">
    <div class="w-full hana-card p-4!" :class="{ 'border-2 border-hana-blue dark:border-hana-blue-200 shadow-none': isRecently }">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-2xl text-hana-blue font-bold dark:text-hana-blue-200">评论</span>
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
          <span class="text-nowrap hidden group-hover:block">发表评论</span>
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
        />
      </main>
    </div>
    <div v-if="type !== 'recently'" class="m-auto">
      <HanaPaginator v-model="page" :total="parentCount" :page-size="pageSize" />
    </div>
  </div>
  <CommentSubmit v-model="submitDialogVisible" :is-recently="isRecently" :reply-to="replyTo" @published="handlePublished" />
</template>
