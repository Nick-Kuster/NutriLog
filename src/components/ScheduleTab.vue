<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertTriangle, CheckSquare, ChevronLeft, ChevronRight, Eye, GripVertical, Play, ShoppingCart, Trash2, X } from 'lucide-vue-next'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import { useUserPreferencesStore } from '../stores/userPreferences'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import GroceryListModal from './GroceryListModal.vue'

const route = useRoute()
const router = useRouter()
const scheduleStore = useScheduleStore()
const userPreferencesStore = useUserPreferencesStore()
const mealStore = useMealStore()

function todayIsoDate() {
  const today = new Date()
  return toIsoDate(today)
}

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

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatWeekRange(startDate) {
  const endDate = addDays(startDate, 6)
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })

  if (startDate.getFullYear() !== endDate.getFullYear()) {
    return `${startMonth} ${startDate.getDate()}, ${startDate.getFullYear()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`
  }

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`
  }

  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`
}

function formatDate(isoDate) {
  return toLocalDate(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(date.getDate() + days)
  return nextDate
}

function startOfWeek(date) {
  const daysSinceWeekStart = (date.getDay() - userPreferencesStore.weekStartsOn + 7) % 7
  return addDays(date, -daysSinceWeekStart)
}

const selectedDate = computed(() => route.query.date || todayIsoDate())
const currentView = computed(() => route.query.view === 'month' ? 'month' : 'week')
const visibleMonth = ref(new Date(toLocalDate(selectedDate.value).getFullYear(), toLocalDate(selectedDate.value).getMonth(), 1))
const visibleWeekStart = ref(startOfWeek(toLocalDate(selectedDate.value)))

watch(selectedDate, (date) => {
  const localDate = toLocalDate(date)
  if (localDate.getMonth() !== visibleMonth.value.getMonth() || localDate.getFullYear() !== visibleMonth.value.getFullYear()) {
    visibleMonth.value = new Date(localDate.getFullYear(), localDate.getMonth(), 1)
  }

  const weekStart = startOfWeek(localDate)
  if (toIsoDate(weekStart) !== toIsoDate(visibleWeekStart.value)) {
    visibleWeekStart.value = weekStart
  }
})

watch(() => userPreferencesStore.weekStartsOn, () => {
  visibleWeekStart.value = startOfWeek(toLocalDate(selectedDate.value))
})

const groceryShoppingDay = computed(() => userPreferencesStore.groceryShoppingDay)
const groceryListModalWeekStart = ref(null)

function openGroceryList(weekStartIso) {
  groceryListModalWeekStart.value = weekStartIso
}

function closeGroceryList() {
  groceryListModalWeekStart.value = null
}

const scheduledDates = computed(() => new Set(
  scheduleStore.scheduledMeals
    .filter((schedule) => schedule.mealId)
    .map((schedule) => schedule.date),
))
const mealsByDate = computed(() => [...scheduleStore.scheduledMeals]
  .sort((first, second) => first.date.localeCompare(second.date)
    || ((first.order ?? 0) - (second.order ?? 0))
    || String(first.mealId).localeCompare(String(second.mealId)))
  .reduce((groups, schedule) => {
  if (!schedule.mealId) return groups

  const meal = mealStore.mealById(schedule.mealId)
  if (!meal) return groups

  return {
    ...groups,
    [schedule.date]: [
      ...(groups[schedule.date] ?? []),
      { ...meal, date: schedule.date, scheduleOrder: schedule.order ?? 0 },
    ],
  }
}, {}))
const selectedMeals = computed(() => mealsByDate.value[selectedDate.value] ?? [])
const previewMeal = computed(() => {
  if (!route.query.previewMeal) return null

  const meal = mealStore.mealById(route.query.previewMeal)
  if (!meal) return null

  const scheduledMeal = scheduleStore.scheduledMeals.find((schedule) => (
    String(schedule.mealId) === String(meal.id)
  ))

  return {
    ...meal,
    date: scheduledMeal?.date ?? '',
  }
})
const swipeStart = ref(null)
const monthTransitionName = ref('month-slide-next')
const draggedMeal = ref(null)
const mealPendingDelete = ref(null)
const isDeletingMeal = ref(false)
const deleteMealError = ref('')
const weekTransitionName = ref('week-slide-next')
const isSelectionMode = ref(false)
const selectedMealIds = ref(new Set())
const isBulkDeleteConfirmOpen = ref(false)
const isBulkDeleting = ref(false)
const bulkDeleteError = ref('')
const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = addDays(visibleWeekStart.value, index)
  const isoDate = toIsoDate(date)

  return {
    isoDate,
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: date.getDate(),
    isToday: isoDate === todayIsoDate(),
    isShoppingDay: groceryShoppingDay.value !== null && date.getDay() === groceryShoppingDay.value,
    meals: mealsByDate.value[isoDate] ?? [],
  }
}))
const calendarDays = computed(() => {
  const year = visibleMonth.value.getFullYear()
  const month = visibleMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstGridDay = new Date(year, month, 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay)
    day.setDate(firstGridDay.getDate() + index)
    const isoDate = toIsoDate(day)

    return {
      isoDate,
      dayNumber: day.getDate(),
      isCurrentMonth: day.getMonth() === month,
      isToday: isoDate === todayIsoDate(),
      isSelected: isoDate === selectedDate.value,
      isScheduled: scheduledDates.value.has(isoDate),
      isShoppingDay: groceryShoppingDay.value !== null && day.getDay() === groceryShoppingDay.value,
    }
  })
})

const weekMealIds = computed(() => weekDays.value.flatMap((day) => day.meals.map((meal) => String(meal.id))))
// visibleMonth (the month-grid state) and visibleWeekStart (the week-view state) only sync when
// navigating via an explicit date click - paging week-by-week or month-by-month lets them drift apart.
// Bulk-select must never trust a possibly-stale visibleMonth; derive the target month fresh from
// whichever view is actually on screen so the button label and the real selection can't disagree.
const selectionMonthAnchor = computed(() => (currentView.value === 'month' ? visibleMonth.value : visibleWeekStart.value))
const monthMealIds = computed(() => {
  const year = selectionMonthAnchor.value.getFullYear()
  const month = selectionMonthAnchor.value.getMonth()
  const startIsoDate = toIsoDate(new Date(year, month, 1))
  const endIsoDate = toIsoDate(new Date(year, month + 1, 0))

  const ids = scheduleStore.scheduledMeals
    .filter((schedule) => schedule.mealId && schedule.date >= startIsoDate && schedule.date <= endIsoDate)
    .map((schedule) => String(schedule.mealId))

  return [...new Set(ids)]
})
const selectedCount = computed(() => selectedMealIds.value.size)
const isAllWeekSelected = computed(() => (
  weekMealIds.value.length > 0 && weekMealIds.value.every((id) => selectedMealIds.value.has(id))
))

function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  if (!isSelectionMode.value) selectedMealIds.value = new Set()
}

function isMealSelected(meal) {
  return selectedMealIds.value.has(String(meal.id))
}

function toggleMealSelected(meal) {
  const nextSelected = new Set(selectedMealIds.value)
  const mealId = String(meal.id)

  if (nextSelected.has(mealId)) {
    nextSelected.delete(mealId)
  } else {
    nextSelected.add(mealId)
  }

  selectedMealIds.value = nextSelected
}

function toggleSelectAllWeek() {
  const nextSelected = new Set(selectedMealIds.value)

  if (isAllWeekSelected.value) {
    for (const id of weekMealIds.value) nextSelected.delete(id)
  } else {
    for (const id of weekMealIds.value) nextSelected.add(id)
  }

  selectedMealIds.value = nextSelected
}

function selectAllInMonth() {
  isSelectionMode.value = true
  selectedMealIds.value = new Set(monthMealIds.value)
}

function requestBulkDelete() {
  if (!selectedMealIds.value.size) return
  bulkDeleteError.value = ''
  isBulkDeleteConfirmOpen.value = true
}

function cancelBulkDelete() {
  if (isBulkDeleting.value) return
  isBulkDeleteConfirmOpen.value = false
}

async function confirmBulkDelete() {
  if (isBulkDeleting.value) return

  isBulkDeleting.value = true
  bulkDeleteError.value = ''

  try {
    await mealStore.deleteMeals([...selectedMealIds.value])
    selectedMealIds.value = new Set()
    isSelectionMode.value = false
    isBulkDeleteConfirmOpen.value = false
  } catch (error) {
    bulkDeleteError.value = error instanceof Error ? error.message : 'Could not delete meals.'
  } finally {
    isBulkDeleting.value = false
  }
}

function moveMonth(months) {
  monthTransitionName.value = months > 0 ? 'month-slide-next' : 'month-slide-prev'
  visibleMonth.value = addMonths(visibleMonth.value, months)
}

function moveWeek(days) {
  weekTransitionName.value = days > 0 ? 'week-slide-next' : 'week-slide-prev'
  visibleWeekStart.value = addDays(visibleWeekStart.value, days)
}

function setView(view) {
  const { view: currentQueryView, ...nextQuery } = route.query

  router.push({
    name: 'schedule',
    query: {
      ...nextQuery,
      ...(view === 'month' ? { view: 'month' } : {}),
    },
  })
}

function selectDay(day) {
  router.push({
    name: 'schedule',
    query: {
      ...route.query,
      date: day.isoDate,
    },
  })
}

function previewScheduledMeal(meal) {
  router.push({
    name: 'schedule',
    query: {
      ...route.query,
      previewMeal: meal.id,
    },
  })
}

function closeMealPreview() {
  if (!route.query.previewMeal) return

  const { previewMeal, ...nextQuery } = route.query

  router.replace({
    name: 'schedule',
    query: nextQuery,
  })
}

function requestDeleteMeal(meal) {
  deleteMealError.value = ''
  mealPendingDelete.value = meal
}

function cancelDeleteMeal() {
  if (isDeletingMeal.value) return
  deleteMealError.value = ''
  mealPendingDelete.value = null
}

async function confirmDeleteMeal() {
  if (!mealPendingDelete.value || isDeletingMeal.value) return

  const mealId = mealPendingDelete.value.id
  isDeletingMeal.value = true
  deleteMealError.value = ''

  try {
    await mealStore.deleteMeal(mealId)
    mealPendingDelete.value = null

    if (route.query.previewMeal && String(route.query.previewMeal) === String(mealId)) {
      closeMealPreview()
    }
  } catch (error) {
    deleteMealError.value = error instanceof Error ? error.message : 'Could not delete meal.'
  } finally {
    isDeletingMeal.value = false
  }
}

function startMealDrag(meal) {
  draggedMeal.value = {
    date: meal.date,
    mealId: meal.id,
  }
}

function finishMealDrag() {
  draggedMeal.value = null
}

function dropMeal(day, index = day.meals.length) {
  if (!draggedMeal.value) return

  scheduleStore.moveScheduledMeal(
    draggedMeal.value.date,
    draggedMeal.value.mealId,
    day.isoDate,
    index,
  )

  router.replace({
    name: 'schedule',
    query: {
      ...route.query,
      date: day.isoDate,
    },
  })
  finishMealDrag()
}

function startScheduleSwipe(event) {
  const touch = event.changedTouches?.[0]
  swipeStart.value = {
    x: touch?.clientX ?? event.clientX,
    y: touch?.clientY ?? event.clientY,
  }
}

function finishMonthSwipe(event) {
  if (!swipeStart.value) return

  const touch = event.changedTouches?.[0]
  const endX = touch?.clientX ?? event.clientX
  const endY = touch?.clientY ?? event.clientY
  const deltaX = endX - swipeStart.value.x
  const deltaY = endY - swipeStart.value.y
  swipeStart.value = null

  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return

  moveMonth(deltaX < 0 ? 1 : -1)
}

function finishWeekSwipe(event) {
  if (!swipeStart.value) return

  const touch = event.changedTouches?.[0]
  const endX = touch?.clientX ?? event.clientX
  const endY = touch?.clientY ?? event.clientY
  const deltaX = endX - swipeStart.value.x
  const deltaY = endY - swipeStart.value.y
  swipeStart.value = null

  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return

  moveWeek(deltaX < 0 ? 7 : -7)
}
</script>

<template>
  <section class="content schedule-page">
    <header class="topbar">
      <div>
        <p class="eyebrow">Schedule</p>
        <h1>{{ currentView === 'week' ? formatWeekRange(visibleWeekStart) : formatMonthYear(visibleMonth) }}</h1>
      </div>
      <div class="schedule-toolbar">
        <div class="exercise-mode-toggle schedule-view-toggle" role="group" aria-label="Schedule view">
          <button
            type="button"
            class="exercise-mode-button"
            :class="{ active: currentView === 'week' }"
            @click="setView('week')"
          >
            Week
          </button>
          <button
            type="button"
            class="exercise-mode-button"
            :class="{ active: currentView === 'month' }"
            @click="setView('month')"
          >
            Month
          </button>
        </div>
        <div class="schedule-month-actions">
        <button class="icon-action" type="button" :aria-label="currentView === 'week' ? 'Previous week' : 'Previous month'" @click="currentView === 'week' ? moveWeek(-7) : moveMonth(-1)">
          <ChevronLeft :size="20" />
        </button>
        <button class="icon-action" type="button" :aria-label="currentView === 'week' ? 'Next week' : 'Next month'" @click="currentView === 'week' ? moveWeek(7) : moveMonth(1)">
          <ChevronRight :size="20" />
        </button>
        </div>
        <button class="utility-action" type="button" @click="toggleSelectionMode">
          <component :is="isSelectionMode ? X : CheckSquare" :size="18" /> {{ isSelectionMode ? 'Cancel' : 'Select' }}
        </button>
      </div>
    </header>

    <div v-if="isSelectionMode" class="bulk-select-bar">
      <label class="bulk-select-option">
        <input type="checkbox" :checked="isAllWeekSelected" @change="toggleSelectAllWeek" />
        <span>Select all this week</span>
      </label>
      <button class="utility-action" type="button" @click="selectAllInMonth">
        Select all in {{ formatMonthYear(selectionMonthAnchor) }}
      </button>
      <span class="bulk-select-count">{{ selectedCount }} selected</span>
      <button class="secondary-action danger-action" type="button" :disabled="!selectedCount" @click="requestBulkDelete">
        <Trash2 :size="16" /> Delete Selected
      </button>
    </div>

    <section
      v-if="currentView === 'week'"
      class="week-schedule-panel"
      aria-label="Weekly meal schedule"
      @pointerdown="startScheduleSwipe"
      @pointerup="finishWeekSwipe"
      @touchstart.passive="startScheduleSwipe"
      @touchend.passive="finishWeekSwipe"
    >
      <p class="schedule-instructions">Hold and drag meals to move them to another day or reorder the week.</p>
      <div class="week-schedule-viewport">
        <Transition :name="weekTransitionName">
          <div :key="toIsoDate(visibleWeekStart)" class="week-schedule-board">
            <article
              v-for="day in weekDays"
              :key="day.isoDate"
              class="week-day-column"
              :class="{ today: day.isToday }"
              @dragover.prevent
              @drop="dropMeal(day)"
            >
              <header class="week-day-header">
                <span>{{ day.weekday }}</span>
                <strong>{{ day.dayNumber }}</strong>
                <button
                  v-if="day.isShoppingDay"
                  class="icon-action shopping-day-badge"
                  type="button"
                  aria-label="Open grocery list for this week"
                  @click="openGroceryList(toIsoDate(visibleWeekStart))"
                >
                  <ShoppingCart :size="16" />
                </button>
              </header>

              <div class="week-workout-list">
                <article
                  v-for="(meal, index) in day.meals"
                  :key="`${meal.date}-${meal.id}`"
                  class="week-workout-card"
                  :class="{ 'selection-mode': isSelectionMode, selected: isMealSelected(meal) }"
                  :draggable="!isSelectionMode"
                  @dragstart="startMealDrag(meal)"
                  @dragend="finishMealDrag"
                  @dragover.prevent
                  @drop.stop="dropMeal(day, index)"
                  @click="isSelectionMode && toggleMealSelected(meal)"
                >
                  <label v-if="isSelectionMode" class="check" @click.stop>
                    <input type="checkbox" :checked="isMealSelected(meal)" @change="toggleMealSelected(meal)" />
                    <span aria-hidden="true"></span>
                  </label>
                  <GripVertical v-else :size="16" />
                  <div class="week-workout-main">
                    <h2>{{ meal.name }}</h2>
                    <p>{{ meal.mealType }}{{ meal.calories ? ` · ${meal.calories} cal` : '' }}</p>
                  </div>
                  <template v-if="!isSelectionMode">
                    <button
                      class="icon-action workout-preview-button"
                      type="button"
                      :aria-label="`Preview ${meal.name}`"
                      @click.stop="previewScheduledMeal(meal)"
                    >
                      <Eye :size="16" />
                    </button>
                    <button
                      class="icon-action workout-delete-button danger-icon-button"
                      type="button"
                      :aria-label="`Delete ${meal.name}`"
                      @click.stop="requestDeleteMeal(meal)"
                    >
                      <Trash2 :size="16" />
                    </button>
                  </template>
                </article>
                <p v-if="!day.meals.length" class="week-day-empty">Drop meal here</p>
              </div>
            </article>
          </div>
        </Transition>
      </div>
    </section>

    <div v-else class="schedule-layout">
      <section
        class="calendar-panel"
        aria-label="Meal calendar"
        @pointerdown="startScheduleSwipe"
        @pointerup="finishMonthSwipe"
        @touchstart.passive="startScheduleSwipe"
        @touchend.passive="finishMonthSwipe"
      >
        <div class="calendar-weekdays" aria-hidden="true">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div class="calendar-viewport">
          <Transition :name="monthTransitionName">
            <div :key="`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}`" class="calendar-grid">
            <div
              v-for="day in calendarDays"
              :key="day.isoDate"
              class="calendar-day"
              :class="{
                muted: !day.isCurrentMonth,
                today: day.isToday,
                selected: day.isSelected,
                scheduled: day.isScheduled,
              }"
              role="button"
              tabindex="0"
              :aria-label="`${day.isoDate}${day.isScheduled ? ', scheduled meal' : ''}`"
              @click="selectDay(day)"
              @keydown.enter="selectDay(day)"
            >
              <span>{{ day.dayNumber }}</span>
              <button
                v-if="day.isShoppingDay"
                class="calendar-day-shopping-badge"
                type="button"
                aria-label="Open grocery list for this week"
                @click.stop="openGroceryList(toIsoDate(startOfWeek(toLocalDate(day.isoDate))))"
              >
                <ShoppingCart :size="12" />
              </button>
            </div>
            </div>
          </Transition>
        </div>
      </section>

      <aside class="day-summary" aria-label="Selected day meals">
        <p class="eyebrow">{{ formatDate(selectedDate) }}</p>
        <h2>{{ selectedMeals.length ? 'Scheduled meals' : 'No meals scheduled' }}</h2>

        <div v-if="selectedMeals.length" class="day-workout-list">
                    <article v-for="meal in selectedMeals" :key="meal.id" class="day-workout-card">
            <div class="day-workout-main">
              <h3>{{ meal.name }}</h3>
              <p>{{ meal.mealType }}</p>
            </div>
            <div class="day-workout-meta">
              <span>{{ meal.servings }}x</span>
              <span v-if="meal.calories">{{ meal.calories }} cal</span>
              <span>{{ meal.ingredients.length }} ingredients</span>
            </div>
                        <div class="day-workout-actions">
              <RouterLink class="secondary-action" :to="{ name: 'meal', params: { mealId: meal.id } }" @click.stop>
                Open meal
              </RouterLink>
              <button class="utility-action" type="button" @click="previewScheduledMeal(meal)">
                <Eye :size="18" /> Preview ingredients
              </button>
              <button class="secondary-action danger-action" type="button" @click="requestDeleteMeal(meal)">
                <Trash2 :size="18" /> Delete meal
              </button>
            </div>
          </article>
        </div>
      </aside>
    </div>

    <ConfirmDeleteModal
      v-if="mealPendingDelete"
      :meal-name="mealPendingDelete.name"
      :is-deleting="isDeletingMeal"
      :error="deleteMealError"
      @cancel="cancelDeleteMeal"
      @confirm="confirmDeleteMeal"
    />

    <Teleport to="body">
      <div v-if="isBulkDeleteConfirmOpen" class="modal-overlay" @click.self="cancelBulkDelete">
        <div class="modal-card confirm-delete-modal" role="dialog" aria-modal="true" aria-label="Delete selected meals">
          <header class="confirm-delete-header">
            <span class="confirm-delete-icon" aria-hidden="true">
              <AlertTriangle :size="22" />
            </span>
            <button class="icon-action" type="button" aria-label="Cancel delete" :disabled="isBulkDeleting" @click="cancelBulkDelete">
              <X :size="18" />
            </button>
          </header>

          <div class="confirm-delete-body">
            <p class="eyebrow">Delete meals</p>
            <h3>{{ selectedCount }} meal{{ selectedCount === 1 ? '' : 's' }}</h3>
            <p>This removes the selected meals from your library and any scheduled days. This cannot be undone.</p>
            <p v-if="bulkDeleteError" class="form-error">{{ bulkDeleteError }}</p>
          </div>

          <footer class="modal-footer confirm-delete-actions">
            <button class="secondary-action" type="button" :disabled="isBulkDeleting" @click="cancelBulkDelete">Cancel</button>
            <button class="secondary-action danger-action" type="button" :disabled="isBulkDeleting" @click="confirmBulkDelete">
              <Trash2 :size="18" /> {{ isBulkDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <GroceryListModal
      v-if="groceryListModalWeekStart"
      :week-start="groceryListModalWeekStart"
      @close="closeGroceryList"
    />

    <Teleport to="body">
      <div v-if="previewMeal" class="modal-overlay" @click.self="closeMealPreview">
        <div class="modal-card workout-preview-modal" role="dialog" aria-modal="true" :aria-label="`${previewMeal.name} preview`">
          <header class="modal-header">
            <div>
              <p class="eyebrow">{{ previewMeal.date || 'Scheduled meal' }}</p>
              <h3>{{ previewMeal.name }}</h3>
            </div>
            <button class="icon-action" type="button" aria-label="Close preview" @click="closeMealPreview">
              <X :size="18" />
            </button>
          </header>

          <div class="workout-preview-meta">
            <span>{{ previewMeal.servings }}x servings</span>
            <span>{{ previewMeal.mealType }}</span>
            <span v-if="previewMeal.calories">{{ previewMeal.calories }} cal</span>
          </div>

          <div class="workout-preview-blocks">
            <section class="workout-preview-block">
              <div class="workout-preview-block-header">
                <h4>Ingredients</h4>
                <span>{{ previewMeal.ingredients.length }}</span>
              </div>
              <ul>
                <li v-for="ingredient in previewMeal.ingredients" :key="ingredient.id">
                  <strong>{{ ingredient.name }}</strong>
                  <span>{{ ingredient.quantity }}{{ ingredient.unit ? ` ${ingredient.unit}` : '' }}</span>
                </li>
              </ul>
            </section>
          </div>

          <footer class="modal-footer">
            <button class="secondary-action" type="button" @click="closeMealPreview">Close</button>
            <button class="secondary-action danger-action" type="button" @click="requestDeleteMeal(previewMeal)">
              <Trash2 :size="18" /> Delete
            </button>
            <RouterLink class="primary-action workout-open-button" :to="{ name: 'meal', params: { mealId: previewMeal.id } }" aria-label="Open meal">
              <Play :size="18" />
            </RouterLink>
          </footer>
        </div>
      </div>
    </Teleport>
  </section>
</template>
