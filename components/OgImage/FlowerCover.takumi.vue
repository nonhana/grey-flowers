<script setup lang="ts">
import { seoData } from '~/data/meta'

defineProps<{
  title: string
  publishedAt: string
}>()
</script>

<template>
  <div
    class="relative h-full w-full overflow-hidden"
    style="background: linear-gradient(145deg, oklch(0.985 0.006 240) 0%, oklch(0.97 0.009 244) 52%, oklch(0.982 0.004 248) 100%); color: oklch(0.24 0.03 252); font-family: 'Noto Serif SC', serif; font-weight: 400;"
  >
    <div
      class="absolute inset-0"
      style="background:
        radial-gradient(circle at 84% 16%, oklch(0.91 0.028 239 / 0.85) 0%, transparent 30%),
        radial-gradient(circle at 22% 78%, oklch(0.95 0.02 254 / 0.72) 0%, transparent 26%);"
    />

    <div class="relative h-full flex flex-col px-[86px] py-[72px]">
      <div class="flex items-start justify-between gap-8">
        <div class="flex items-center gap-4">
          <span
            class="h-[18px] w-[18px] rounded-full"
            style="background: linear-gradient(135deg, oklch(0.72 0.055 244) 0%, oklch(0.88 0.022 215) 100%);"
          />
          <span
            class="text-[30px] leading-none tracking-[-0.04em]"
            style="font-family: 'Noto Serif SC', serif;"
          >
            {{ seoData.siteName }}
          </span>
        </div>

        <span
          class="pt-[6px] text-right text-[18px] leading-none tracking-[0.22em]"
          style="font-family: 'JetBrains Mono', monospace; color: oklch(0.52 0.028 252);"
        >
          {{ publishedAt }}
        </span>
      </div>

      <div class="min-h-0 flex flex-1 flex-col justify-center pb-[36px] pt-[40px]">
        <div class="max-w-[940px] flex flex-col items-start gap-[28px]">
          <h1
            class="m-0 block w-full overflow-hidden text-[86px] leading-[1.06] tracking-[-0.055em]"
            style="font-family: 'Noto Serif SC', serif; max-height: 364px;"
          >
            {{ title }}
          </h1>

          <p
            class="m-0 block max-w-[760px] w-full overflow-hidden text-[28px] leading-[1.42]"
            style="font-family: 'Noto Serif SC', serif; color: oklch(0.42 0.028 252); max-height: 122px;"
          >
            {{ seoData.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
