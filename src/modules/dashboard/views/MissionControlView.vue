<script setup lang="ts">
import AccountHealthSection from '@/modules/dashboard/components/AccountHealthSection.vue'
import EconomicEventsSection from '@/modules/dashboard/components/EconomicEventsSection.vue'
import FreedomProgressSection from '@/modules/dashboard/components/FreedomProgressSection.vue'
import GoodMorningSection from '@/modules/dashboard/components/GoodMorningSection.vue'
import PendingReviewsSection from '@/modules/dashboard/components/PendingReviewsSection.vue'
import TodayMissionSection from '@/modules/dashboard/components/TodayMissionSection.vue'
import TradingFocusSection from '@/modules/dashboard/components/TradingFocusSection.vue'
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <GoodMorningSection class="lg:col-span-2" />
      <TodayMissionSection />
      <EconomicEventsSection />
      <TradingFocusSection />
      <PendingReviewsSection />
      <AccountHealthSection />
      <FreedomProgressSection />
    </div>
  </div>
</template>
