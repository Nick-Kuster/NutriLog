<script setup>
import { CalendarDays, FileJson, Salad, Settings, ShoppingCart } from 'lucide-vue-next'

defineProps({
  activeTab: { type: String, required: true },
})
</script>

<template>
  <nav class="mobile-tab-bar" aria-label="Primary">
    <RouterLink class="mobile-tab-item" :class="{ active: activeTab === 'meals' }" :to="{ name: 'meals' }">
      <Salad :size="20" />
      <span>Meals</span>
    </RouterLink>
    <RouterLink class="mobile-tab-item" :class="{ active: activeTab === 'schedule' }" :to="{ name: 'schedule' }">
      <CalendarDays :size="20" />
      <span>Schedule</span>
    </RouterLink>
    <RouterLink class="mobile-tab-item" :class="{ active: activeTab === 'grocery' }" :to="{ name: 'grocery' }">
      <ShoppingCart :size="20" />
      <span>Grocery</span>
    </RouterLink>
    <RouterLink class="mobile-tab-item" :class="{ active: activeTab === 'tools' }" :to="{ name: 'tools' }">
      <FileJson :size="20" />
      <span>Import/Export</span>
    </RouterLink>
    <RouterLink class="mobile-tab-item" :class="{ active: activeTab === 'settings' }" :to="{ name: 'settings' }">
      <Settings :size="20" />
      <span>Settings</span>
    </RouterLink>
  </nav>
</template>
