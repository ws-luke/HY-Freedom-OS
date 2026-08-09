<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import MobileNavigation from '@/components/MobileNavigation.vue'
</script>

<template>
  <div class="hy-app-shell min-h-screen">
    <AppSidebar />

    <div class="min-h-screen lg:pl-64">
      <AppHeader />

      <main class="hy-main-content px-4 pt-4 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-[1800px]">
          <RouterView />
        </div>
      </main>
    </div>

    <MobileNavigation />
  </div>
</template>
