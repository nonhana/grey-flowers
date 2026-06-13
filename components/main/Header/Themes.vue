<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'
import type { DropdownCommand } from '~/types/common'
import { Laptop, Moon, Sun } from '@lucide/vue'

const themesMap: Array<{
  text: 'system' | 'light' | 'dark'
  icon: LucideIcon
}> = [
  {
    text: 'system',
    icon: Laptop,
  },
  {
    text: 'light',
    icon: Sun,
  },
  {
    text: 'dark',
    icon: Moon,
  },
]

const colorMode = useColorMode()
const currentThemeIcon = computed(() => themesMap.find(item => item.text === colorMode.preference)?.icon)

function handleThemesCommand(command: DropdownCommand) {
  colorMode.preference = command as 'light' | 'dark' | 'system'
}
</script>

<template>
  <ClientOnly>
    <HanaDropdown animation="slide" :show-arrow="false" @command="handleThemesCommand">
      <HanaButton
        icon-button
        :icon="currentThemeIcon"
        aria-label="切换主题"
        class="ml-auto"
      />
      <template #dropdown>
        <HanaDropdownMenu>
          <HanaDropdownItem
            v-for="item in themesMap"
            :key="item.text"
            :icon="item.icon"
            :command="item.text"
          >
            {{ item.text }}
          </HanaDropdownItem>
        </HanaDropdownMenu>
      </template>
    </HanaDropdown>
  </ClientOnly>
</template>
