<script setup lang="ts">
import { useStore } from '~/store'

const visible = defineModel<boolean>()

const { userStore } = useStore()
const { userInfo } = toRefs(userStore)

const [editMode, toggleEditMode] = useToggle(false)
</script>

<template>
  <HanaDialog v-model="visible" title="个人信息" width="500px">
    <div class="mb-4 flex flex-col items-center gap-2 font-code text-sm text-text dark:text-hana-white-700">
      <NuxtImg :src="userInfo!.avatar!" width="100" height="100" class="rounded-full" />
      <span>根据邮箱使用 <strong>weavatar</strong> 自动生成</span>
      <span>您可以前往 <ProseA href="https://weavatar.com" target="_blank">weavatar.com</ProseA> 修改头像</span>
    </div>
    <table class="w-full md:m-auto md:w-4/5">
      <tbody>
        <tr class="h-10 border-b-2 border-hana-blue-200 dark:border-hana-black-200">
          <td class="w-20 font-code font-bold text-text dark:text-hana-white-700">
            用户名
          </td>
          <td class="dark:text-hana-white">
            {{ userInfo!.username }}
          </td>
        </tr>
        <tr class="h-10 border-b-2 border-hana-blue-200 dark:border-hana-black-200">
          <td class="w-20 font-code font-bold text-text dark:text-hana-white-700">
            邮箱
          </td>
          <td class="dark:text-hana-white">
            {{ userInfo!.email }}
          </td>
        </tr>
        <tr class="h-10 border-b-2 border-hana-blue-200 dark:border-hana-black-200">
          <td class="w-20 font-code font-bold text-text dark:text-hana-white-700">
            站点
          </td>
          <td class="dark:text-hana-white">
            {{ userInfo!.site ?? '暂无站点' }}
          </td>
        </tr>
      </tbody>
    </table>
    <div class="mt-8 flex gap-4">
      <HanaButton class="flex-1" @click="visible = false">
        关闭
      </HanaButton>
      <HanaButton class="flex-1" dark-mode @click="toggleEditMode">
        编辑
      </HanaButton>
    </div>
  </HanaDialog>
  <UserInfoEditor v-model="editMode" />
</template>
