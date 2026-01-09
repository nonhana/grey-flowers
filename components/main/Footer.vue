<script setup lang="ts">
import dayjs from 'dayjs'

const appConfig = useAppConfig()
const siteLaunchDate = dayjs(appConfig.siteLaunchDate)

const runDays = ref(0)

onMounted(() => {
  const today = dayjs()
  runDays.value = today.diff(siteLaunchDate, 'day')
})
</script>

<template>
  <div class="mx-auto flex flex-col gap-4 px-8 py-4 md:max-w-[90%] xl:max-w-[70%]">
    <div class="w-full flex flex-col gap-4 md:flex-row md:items-center">
      <div class="flex items-center gap-2">
        <span class="text-text font-code dark:text-hana-white-700">导航</span>
        <Icon name="lucide:chevron-right" class="text-text dark:text-hana-white-700" />
        <ProseA href="/about" target="_self">
          关于
        </ProseA>
        <ProseA href="/links" target="_self">
          友链
        </ProseA>
        <ProseA href="/about#comments" target="_self">
          留言
        </ProseA>
        <ProseA href="/rss.xml">
          RSS
        </ProseA>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-text font-code dark:text-hana-white-700">联系我</span>
        <Icon name="lucide:chevron-right" class="text-text dark:text-hana-white-700" />
        <ProseA href="https://github.com/nonhana">
          GitHub
        </ProseA>
        <ProseA href="https://qm.qq.com/q/nkm9pWgpTc">
          QQ
        </ProseA>
        <ProseA href="mailto:nonhana@outlook.com">
          发邮件
        </ProseA>
      </div>
    </div>
    <div class="w-full flex items-center gap-2 dark:text-hana-white">
      <span>灰色的花终会绽放</span>
      <span class="text-text dark:text-hana-white-700">·</span>
      <span>苗圃已浇灌 {{ runDays }} 天</span>
    </div>
    <div class="w-full flex flex-col gap-2 text-sm md:flex-row md:items-center dark:text-hana-white">
      <span>Copyright © 2024-2026 Hana's Garden</span>
      <span class="text-text hidden md:block dark:text-hana-white-700">|</span>
      <span>Powered by <ProseA href="https://github.com/nonhana/grey-flowers">GreyFlowers</ProseA></span>
      <span class="text-text hidden md:block dark:text-hana-white-700">|</span>
      <NuxtLink href="https://icp.gov.moe/?keyword=20241500" target="_blank">
        萌ICP备20241500号
      </NuxtLink>
    </div>
  </div>
</template>
