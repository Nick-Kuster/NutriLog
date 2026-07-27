<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import { aggregateGroceryItems, groupGroceryItemsByCategory } from '../lib/groceryAggregation'
import { GROCERY_CATEGORIES } from '../lib/groceryCategories'
import { useGroceryStore } from '../stores/grocery'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import { useUserPreferencesStore } from '../stores/userPreferences'
import GroceryCategoryList from './GroceryCategoryList.vue'

const route = useRoute()
const scheduleStore = useScheduleStore()
const mealStore = useMealStore()
const userPreferencesStore = useUserPreferencesStore()
const groceryStore = useGroceryStore()

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)
  return nextDate
}

function startOfGroceryWeek(date) {
  const daysSinceWeekStart = (date.getDay() - userPreferencesStore.weekStartsOn + 7) % 7
  return addDays(date, -daysSinceWeekStart)
}

function formatWeekRange(start, end) {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

function initialWeekAnchor() {
  const weekParam = route.query.week
  return typeof weekParam === 'string' && weekParam ? toLocalDate(weekParam) : new Date()
}

const selectedWeekStart = ref(startOfGroceryWeek(initialWeekAnchor()))
const newItemName = ref('')
const newItemQuantity = ref(1)
const newItemUnit = ref('')
const newItemCategory = ref('Other')
const addItemError = ref('')

const selectedWeekEnd = computed(() => addDays(selectedWeekStart.value, 6))
const weekDateRange = computed(() => formatWeekRange(selectedWeekStart.value, selectedWeekEnd.value))
const weekStartIso = computed(() => toIsoDate(selectedWeekStart.value))

const mealsThisWeek = computed(() => {
  const startIsoDate = toIsoDate(selectedWeekStart.value)
  const endIsoDate = toIsoDate(selectedWeekEnd.value)

  return scheduleStore.scheduledMeals
    .filter((schedule) => schedule.date >= startIsoDate && schedule.date <= endIsoDate)
    .map((schedule) => mealStore.mealById(schedule.mealId))
    .filter(Boolean)
})

const aggregatedItems = computed(() => aggregateGroceryItems(mealsThisWeek.value))
const groupedCategories = computed(() => groupGroceryItemsByCategory(aggregatedItems.value, groceryStore.extraItems, GROCERY_CATEGORIES))

const totalItemCount = computed(() => aggregatedItems.value.length + groceryStore.extraItems.length)
const checkedItemCount = computed(() => (
  aggregatedItems.value.filter((item) => groceryStore.isChecked(item.itemKey)).length
  + groceryStore.extraItems.filter((item) => item.isChecked).length
))

function moveWeek(days) {
  selectedWeekStart.value = addDays(selectedWeekStart.value, days)
}

async function addExtraItem() {
  addItemError.value = ''

  const name = newItemName.value.trim()
  if (!name) {
    addItemError.value = 'Enter an item name.'
    return
  }

  try {
    await groceryStore.addExtraItem({
      name,
      quantity: Number(newItemQuantity.value) > 0 ? Number(newItemQuantity.value) : 1,
      unit: newItemUnit.value.trim(),
      category: newItemCategory.value,
    })

    newItemName.value = ''
    newItemQuantity.value = 1
    newItemUnit.value = ''
  } catch (error) {
    addItemError.value = error instanceof Error ? error.message : 'Could not add item.'
  }
}

watch(weekStartIso, (weekStart) => {
  groceryStore.loadWeek(weekStart)
}, { immediate: true })

onMounted(() => {
  groceryStore.loadWeek(weekStartIso.value)
})
</script>

<template>
  <section class="content">
    <header class="topbar">
      <div class="week-title-row">
        <button class="icon-action week-nav-button" type="button" aria-label="Previous week" @click="moveWeek(-7)">
          <ChevronLeft :size="22" />
        </button>
        <div>
          <p class="eyebrow">Grocery week</p>
          <h1>{{ weekDateRange }}</h1>
        </div>
        <button class="icon-action week-nav-button" type="button" aria-label="Next week" @click="moveWeek(7)">
          <ChevronRight :size="22" />
        </button>
      </div>
    </header>

    <p v-if="totalItemCount" class="import-status">{{ checkedItemCount }} of {{ totalItemCount }} items checked off.</p>

    <section class="form-section">
      <h2>Add item</h2>
      <p v-if="addItemError" class="form-error">{{ addItemError }}</p>
      <form class="grocery-add-form" novalidate @submit.prevent="addExtraItem">
        <input v-model="newItemName" type="text" placeholder="Item name" aria-label="Item name" />
        <input v-model.number="newItemQuantity" type="number" min="0" step="0.25" placeholder="Qty" aria-label="Quantity" />
        <input v-model="newItemUnit" type="text" placeholder="unit" aria-label="Unit" />
        <select v-model="newItemCategory" aria-label="Category">
          <option v-for="category in GROCERY_CATEGORIES" :key="category" :value="category">{{ category }}</option>
        </select>
        <button class="secondary-action" type="submit"><Plus :size="16" /> Add</button>
      </form>
    </section>

    <p v-if="!groupedCategories.length" class="empty-week">
      No meals scheduled this week yet. Schedule meals or add items above to build your list.
    </p>

    <GroceryCategoryList v-else :groups="groupedCategories" />
  </section>
</template>
