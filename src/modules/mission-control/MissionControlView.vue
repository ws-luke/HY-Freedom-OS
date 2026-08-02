<script setup lang="ts">
import GoodMorningHero from "./components/GoodMorningHero.vue";

const missions = [
  {
    id: 1,
    title: "畫 4H 趨勢",
    done: false,
  },
  {
    id: 2,
    title: "畫 1H 趨勢",
    done: false,
  },
  {
    id: 3,
    title: "畫 15M 結構",
    done: false,
  },
  {
    id: 4,
    title: "檢查今日重要數據",
    done: false,
  },
  {
    id: 5,
    title: "完成盤前規劃",
    done: false,
  },
];

const accounts = [
  {
    name: "FTMO",
    balance: "$100,000",
    color: "text-emerald-400",
  },
  {
    name: "Live",
    balance: "$12,540",
    color: "text-sky-400",
  },
  {
    name: "Demo",
    balance: "$50,000",
    color: "text-amber-400",
  },
];
</script>

<template>
  <div class="space-y-8">

    <GoodMorningHero />

    <div class="grid gap-6 xl:grid-cols-2">

      <!-- Today's Mission -->

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">

        <div class="mb-6 flex items-center justify-between">

          <h2 class="text-xl font-semibold">
            Today's Mission
          </h2>

          <span class="text-sm text-zinc-500">
            0 / {{ missions.length }}
          </span>

        </div>

        <div
          v-for="mission in missions"
          :key="mission.id"
          class="mb-3 flex items-center gap-3 rounded-2xl bg-zinc-950 p-4 transition hover:bg-zinc-900">

          <input
            type="checkbox"
            class="h-5 w-5 rounded border-zinc-700 bg-zinc-900" />

          <span>
            {{ mission.title }}
          </span>

        </div>

      </section>

      <!-- Accounts -->

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">

        <h2 class="mb-6 text-xl font-semibold">
          Accounts
        </h2>

        <div
          v-for="account in accounts"
          :key="account.name"
          class="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div class="flex items-center justify-between">

            <div>

              <p class="text-zinc-400">
                {{ account.name }}
              </p>

              <h3
                class="mt-2 text-2xl font-bold"
                :class="account.color">

                {{ account.balance }}

              </h3>

            </div>

            <div
              class="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-400">

              Active

            </div>

          </div>

        </div>

      </section>

      <!-- Economic Calendar -->

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">

        <h2 class="mb-6 text-xl font-semibold">
          Economic Calendar
        </h2>

        <div class="space-y-4">

          <div class="rounded-2xl bg-zinc-950 p-4">

            <p class="text-sm text-zinc-500">
              20:30
            </p>

            <h3 class="mt-1 font-medium">
              US Non-Farm Payroll
            </h3>

          </div>

          <div class="rounded-2xl bg-zinc-950 p-4">

            <p class="text-sm text-zinc-500">
              22:00
            </p>

            <h3 class="mt-1 font-medium">
              FOMC Speech
            </h3>

          </div>

        </div>

      </section>

      <!-- Pending Reviews -->

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">

        <h2 class="mb-6 text-xl font-semibold">
          Pending Reviews
        </h2>

        <div class="space-y-4">

          <div class="rounded-2xl bg-zinc-950 p-4">

            <h3 class="font-medium">
              XAUUSD Buy
            </h3>

            <p class="mt-2 text-sm text-zinc-500">
              Waiting for review...
            </p>

          </div>

          <div class="rounded-2xl bg-zinc-950 p-4">

            <h3 class="font-medium">
              EURUSD Sell
            </h3>

            <p class="mt-2 text-sm text-zinc-500">
              Waiting for review...
            </p>

          </div>

        </div>

      </section>

    </div>

  </div>
</template>