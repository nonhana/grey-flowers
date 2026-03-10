<script setup lang="ts">
import type { SNSItem } from '~/types/about'

const welcomeStr = '你好！欢迎来到这里 👋。'
const introStr = '我是 non_hana，意为“没有花”，你也可以叫我 Hana 🌷'
const roleStr = '一个正在努力学习中的 NodeJS Developer'

const welcomeCharArr = [...welcomeStr]
const introCharArr = [...introStr]
const roleCharArr = [...roleStr]

const welcomeRef = useTemplateRef('welcomeRef')
const introRef = useTemplateRef('introRef')
const roleRef = useTemplateRef('roleRef')
const SNSRef = useTemplateRef('SNSRef')

function animateChildren(children: HTMLCollection): Promise<void> {
  const childrenArr = [...children] as HTMLElement[]
  return new Promise((resolve) => {
    childrenArr.forEach((child, index) => {
      setTimeout(() => {
        child.style.transition = `all 0.2s`
        child.style.opacity = '1'
        child.style.top = '0'
        if (index === children.length - 1) {
          resolve()
        }
      }, index * 40)
    })
  })
}

async function animateParent(ref: Ref<HTMLElement | null>) {
  if (ref.value) {
    const children = ref.value.children
    children && await animateChildren(children)
  }
}

onMounted(async () => {
  await animateParent(welcomeRef)
  await animateParent(introRef)
  await animateParent(roleRef)
  await animateParent(SNSRef)
})

const SNSList: SNSItem[] = [
  {
    icon: 'GitHub',
    name: 'GitHub',
    bgColor: '#3d3d3d',
    iconColor: '#fff',
    to: 'https://github.com/nonhana',
  },
  {
    icon: 'QQ',
    name: 'QQ',
    bgColor: '#0099FF',
    iconColor: '#fff',
    to: 'https://qm.qq.com/q/nkm9pWgpTc',
  },
  {
    icon: 'X',
    name: 'X',
    bgColor: '#000',
    iconColor: '#fff',
    to: 'https://x.com/non_hanaz',
  },
  {
    icon: 'Telegram',
    name: 'Telegram',
    bgColor: '#0088cc',
    iconColor: '#fff',
    to: 'https://t.me/nonhana',
  },
  {
    icon: 'Mail',
    name: 'Mail',
    bgColor: '#D44638',
    iconColor: '#fff',
    to: 'mailto:nonhana@outlook.com',
  },
  {
    icon: 'RSS',
    name: 'RSS',
    bgColor: '#ffa500',
    iconColor: '#fff',
    to: '/rss.xml',
  },
  {
    icon: 'CloudMusic',
    name: '网易云音乐',
    bgColor: '#C20C0C',
    iconColor: '#fff',
    to: 'https://y.music.163.com/m/user?id=599663130',
  },
]
</script>

<template>
  <div class="flex flex-col justify-between gap-20 lg:flex-row">
    <div class="flex flex-col gap-8 text-black dark:text-hana-white">
      <p ref="welcomeRef" class="m-auto text-center text-xl lg:m-0 lg:text-start">
        <span
          v-for="(char, index) in welcomeCharArr"
          :key="char"
          :data-index="index"
          class="relative top-10 opacity-0"
        >{{ char }}</span>
      </p>
      <p ref="introRef" class="m-auto text-center text-xl lg:m-0 lg:text-start">
        <span
          v-for="(char, index) in introCharArr"
          :key="char"
          :data-index="index"
          class="relative top-10 opacity-0"
        >{{ char }}</span>
      </p>
      <p ref="roleRef" class="m-auto text-center text-base font-code lg:m-0 lg:text-start">
        <span
          v-for="(char, index) in roleCharArr"
          :key="char"
          :data-index="index"
          class="relative top-10 opacity-0"
        >{{ char }}</span>
      </p>
      <div ref="SNSRef" class="m-auto flex flex-wrap justify-center gap-5 lg:m-0 lg:justify-start">
        <div v-for="sns in SNSList" :key="sns.name" class="relative top-10 opacity-0">
          <AboutSNSIcon v-bind="sns" />
        </div>
      </div>
    </div>
    <NuxtImg class="m-auto size-60 rounded-full lg:m-0" src="/images/avatar.webp" />
  </div>
</template>
