<script setup>
import { computed, watch } from 'vue'
import { ShoppingCart, X } from 'lucide-vue-next'
import { aggregateGroceryItems, groupGroceryItemsByCategory } from '../lib/groceryAggregation'
import { GROCERY_CATEGORIES } from '../lib/groceryCategories'
import { useGroceryStore } from '../stores/grocery'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'

const props = defineProps({
  weekStart: { type: String, required: true },
})

defineEmits(['close'])

const scheduleStore = useScheduleStore()
const mealStore = useMealStore()
const groceryStore = useGroceryStore()

function toLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)
  return nextDate
}

function formatWeekRange(start, end) {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

const weekStartDate = computed(() => toLocalDate(props.weekStart))
const weekEndDate = computed(() => addDays(weekStartDate.value, 6))
const weekEndIso = computed(() => toIsoDate(weekEndDate.value))
const weekDateRange = computed(() => formatWeekRange(weekStartDate.value, weekEndDate.value))

const mealsThisWeek = computed(() => scheduleStore.scheduledMeals
  .filter((schedule) => schedule.date >= props.weekStart && schedule.date <= weekEndIso.value)
  .map((schedule) => mealStore.mealById(schedule.mealId))
  .filter(Boolean))

const aggregatedItems = computed(() => aggregateGroceryItems(mealsThisWeek.value))
const groupedCategories = computed(() => groupGroceryItemsByCategory(aggregatedItems.value, groceryStore.extraItems, GROCERY_CATEGORIES))
const totalItemCount = computed(() => aggregatedItems.value.length + groceryStore.extraItems.length)
const checkedItemCount = computed(() => (
  aggregatedItems.value.filter((item) => groceryStore.isChecked(item.itemKey)).length
  + groceryStore.extraItems.filter((item) => item.isChecked).length
))

watch(() => props.weekStart, (weekStart) => {
  groceryStore.loadWeek(weekStart)
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-card grocery-list-modal" role="dialog" aria-modal="true" aria-label="Grocery list">
        <header class="modal-header">
          <div>
            <p class="eyebrow">Shopping day · {{ weekDateRange }}</p>
            <h3>Grocery List</h3>
          </div>
          <button class="icon-action" type="button" aria-label="Close" @click="$emit('close')">
            <X :size="18" />
          </button>
        </header>

        <p v-if="totalItemCount" class="import-status">{{ checkedItemCount }} of {{ totalItemCount }} items checked off.</p>

        <p v-if="!groupedCategories.length" class="empty-week">
          No meals scheduled this week yet.
        </p>

        <section v-else class="grocery-list grocery-list-modal-body" aria-label="Grocery list by category">
          <article v-for="group in groupedCategories" :key="group.category" class="grocery-category">
            <h2>
              <ShoppingCart :size="18" /> {{ group.category }}
            </h2>

            <ul class="grocery-item-list">
              <li v-for="item in group.auto" :key="item.itemKey" class="grocery-item-row">
                <label class="check">
                  <input
                    type="checkbox"
                    :checked="groceryStore.isChecked(item.itemKey)"
                    @change="groceryStore.setChecked(item.itemKey, $event.target.checked)"
                  />
                  <span aria-hidden="true"></span>
                </label>
                <div class="grocery-item-main" :class="{ checked: groceryStore.isChecked(item.itemKey) }">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.quantity }}{{ item.unit ? ` ${item.unit}` : '' }} · {{ item.meals.join(', ') }}</span>
                </div>
              </li>

              <li v-for="item in group.extra" :key="item.id" class="grocery-item-row">
                <label class="check">
                  <input
                    type="checkbox"
                    :checked="item.isChecked"
                    @change="groceryStore.setExtraItemChecked(item.id, $event.target.checked)"
                  />
                  <span aria-hidden="true"></span>
                </label>
                <div class="grocery-item-main" :class="{ checked: item.isChecked }">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.quantity }}{{ item.unit ? ` ${item.unit}` : '' }} · Custom item</span>
                </div>
              </li>
            </ul>
          </article>
        </section>

        <footer class="modal-footer">
          <button class="secondary-action" type="button" @click="$emit('close')">Close</button>
          <RouterLink class="primary-action" :to="{ name: 'grocery', query: { week: weekStart } }">
            Open full list
          </RouterLink>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
