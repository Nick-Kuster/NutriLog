<script setup>
import { computed } from 'vue'
import { LogOut, Settings, ShoppingCart } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useUserPreferencesStore } from '../stores/userPreferences'

const authStore = useAuthStore()
const userPreferencesStore = useUserPreferencesStore()

const weekdayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

function updateWeekStartsOn(event) {
  userPreferencesStore.setWeekStartsOn(event.target.value)
}

const groceryShoppingDayValue = computed(() => (
  userPreferencesStore.groceryShoppingDay === null || userPreferencesStore.groceryShoppingDay === undefined
    ? ''
    : String(userPreferencesStore.groceryShoppingDay)
))

function updateGroceryShoppingDay(event) {
  userPreferencesStore.setGroceryShoppingDay(event.target.value)
}
</script>

<template>
  <section class="content">
    <header class="topbar">
      <div>
        <p class="eyebrow">Preferences</p>
        <h1>Settings</h1>
      </div>
    </header>

    <section class="tool-grid" aria-label="Settings">
      <article v-if="authStore.isSupabaseConfigured" class="tool-panel">
        <LogOut :size="24" />
        <div>
          <h2>Account</h2>
          <p>{{ authStore.user?.email || 'Signed in' }}</p>
        </div>
        <button class="utility-action" type="button" :disabled="authStore.isLoading" @click="authStore.signOut">
          Sign out
        </button>
      </article>

      <article class="tool-panel">
        <Settings :size="24" />
        <div>
          <h2>Start of week</h2>
          <p>Choose which day your meal week begins on. This drives the Meals, Schedule, and Grocery List pages.</p>
        </div>
        <select :value="userPreferencesStore.weekStartsOn" @change="updateWeekStartsOn">
          <option v-for="option in weekdayOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </article>

      <article class="tool-panel">
        <ShoppingCart :size="24" />
        <div>
          <h2>Grocery shopping day</h2>
          <p>Pick the day you usually shop. It's marked on the Schedule page so you can jump straight to that week's grocery list.</p>
        </div>
        <select :value="groceryShoppingDayValue" @change="updateGroceryShoppingDay">
          <option value="">Not set</option>
          <option v-for="option in weekdayOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </article>
    </section>
  </section>
</template>
