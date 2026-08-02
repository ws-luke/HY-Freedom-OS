<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <AppSidebar />

    <div class="lg:pl-72">
      <AppHeader />

      <main class="p-6 lg:p-10">
        <div class="mx-auto max-w-7xl">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>