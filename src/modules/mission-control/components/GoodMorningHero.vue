<script setup lang="ts">
import { computed } from "vue";

const now = new Date();

const greeting = computed(() => {
  const h = now.getHours();

  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
});

const date = computed(() =>
  now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }),
);

const session = computed(() => {
  const h = now.getHours();

  if (h < 8) return "Asia Session";
  if (h < 15) return "London Session";
  return "New York Session";
});

const quote =
  "No Playbook. No Trade.";
</script>

<template>
  <section
    class="overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-8">

    <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

      <div>

        <p class="text-sm uppercase tracking-[0.3em] text-amber-400">
          {{ greeting }}
        </p>

        <h1 class="mt-3 text-5xl font-bold tracking-tight">
          HY Freedom OS
        </h1>

        <p class="mt-3 text-lg text-zinc-400">
          {{ date }}
        </p>

        <div
          class="mt-6 inline-flex items-center rounded-full border border-emerald-700 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-300">

          {{ session }}

        </div>

      </div>

      <div
        class="max-w-md rounded-2xl border border-zinc-800 bg-black/20 p-6">

        <p class="text-xs uppercase tracking-[0.25em] text-zinc-500">
          Today's Focus
        </p>

        <h2 class="mt-4 text-2xl font-semibold leading-relaxed">
          {{ quote }}
        </h2>

        <p class="mt-4 text-zinc-500">
          Wait for confirmation.
          Protect your capital.
          Execute your playbook.
        </p>

      </div>

    </div>

  </section>
</template>