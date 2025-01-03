<script setup lang="ts">
const themesMap = [
  {
    text: 'system',
    icon: 'lucide:laptop',
  },
  {
    text: 'light',
    icon: 'lucide:sun',
  },
  {
    text: 'dark',
    icon: 'lucide:moon',
  },
]

const colorMode = useColorMode()

function handleThemesCommand(command: string | number | object) {
  colorMode.preference = command as 'light' | 'dark' | 'system'
}
</script>

<template>
  <ClientOnly>
    <HanaDropdown animation="slide" :show-arrow="false" @command="handleThemesCommand">
      <HanaButton
        icon-button
        :icon="themesMap.find((item) => item.text === colorMode.preference)?.icon"
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
