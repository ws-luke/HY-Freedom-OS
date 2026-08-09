<script setup lang="ts">
import AccountSessionControl from '@/components/AccountSessionControl.vue'
import { NAV_ITEMS } from '@/constants/navigation'
</script>

<template>
  <aside
    class="hy-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r lg:flex"
  >
    <div class="border-b border-zinc-800/80 px-5 py-6">
      <p class="text-lg font-semibold tracking-tight text-zinc-100">
        HY 自由交易系統
      </p>

      <p class="mt-1 text-xs text-zinc-500">
        紀律・規劃・復盤・成長
      </p>
    </div>

    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.name"
        :to="item.path"
        class="rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
        active-class="bg-amber-500/15 text-amber-300"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="border-t border-zinc-800/80 p-4">
      <AccountSessionControl />
    </div>
  </aside>
</template>
