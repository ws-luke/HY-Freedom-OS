<script setup lang="ts">
import { computed, ref } from "vue";

interface Mission {
  id: number;
  title: string;
  completed: boolean;
}

const missions = ref<Mission[]>([
  {
    id: 1,
    title: "畫 4H 趨勢",
    completed: false,
  },
  {
    id: 2,
    title: "畫 1H 趨勢",
    completed: false,
  },
  {
    id: 3,
    title: "畫 15M 結構",
    completed: false,
  },
  {
    id: 4,
    title: "確認今日重要數據",
    completed: false,
  },
  {
    id: 5,
    title: "完成盤前規劃",
    completed: false,
  },
]);

const completedCount = computed(() =>
  missions.value.filter((item) => item.completed).length,
);

const progress = computed(() =>
  (completedCount.value / missions.value.length) * 100,
);
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg"
  >
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">
          Today's Mission
        </h2>

        <p class="mt-1 text-sm text-zinc-500">
          完成今天的交易流程
        </p>
      </div>

      <div class="text-right">
        <div class="text-2xl font-bold text-amber-400">
          {{ completedCount }}/{{ missions.length }}
        </div>

        <div class="text-xs text-zinc-500">
          Completed
        </div>
      </div>
    </div>

    <div class="mt-6">
      <div class="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          class="h-full rounded-full bg-amber-400 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <div class="mt-6 space-y-3">
      <label
        v-for="mission in missions"
        :key="mission.id"
        class="flex cursor-pointer items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 transition hover:border-amber-500 hover:bg-zinc-900"
      >
        <div class="flex items-center gap-4">
          <input
            v-model="mission.completed"
            type="checkbox"
            class="h-5 w-5 rounded border-zinc-700 bg-zinc-900 accent-amber-400"
          />

          <span
            :class="[
              'transition',
              mission.completed
                ? 'text-zinc-500 line-through'
                : 'text-white',
            ]"
          >
            {{ mission.title }}
          </span>
        </div>

        <span
          v-if="mission.completed"
          class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400"
        >
          Done
        </span>
      </label>
    </div>
  </section>
</template>