<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Flame, Pencil, Trash2 } from 'lucide-vue-next'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

const props = defineProps({
  mealId: { type: [Number, String], required: true },
})

const router = useRouter()
const mealStore = useMealStore()
const scheduleStore = useScheduleStore()

const meal = computed(() => mealStore.mealById(props.mealId))
const scheduledDate = computed(() => scheduleStore.scheduledMeals.find((schedule) => (
  String(schedule.mealId) === String(props.mealId)
))?.date ?? '')

const isDeleting = ref(false)
const deleteError = ref('')
const isConfirmingDelete = ref(false)
const expandedSections = ref(new Set(['nutrition', 'ingredients', 'instructions', 'notes']))

function isSectionExpanded(section) {
  return expandedSections.value.has(section)
}

function toggleSection(section) {
  const nextExpanded = new Set(expandedSections.value)
  if (nextExpanded.has(section)) {
    nextExpanded.delete(section)
  } else {
    nextExpanded.add(section)
  }
  expandedSections.value = nextExpanded
}

function goBack() {
  router.push({ name: 'meals' })
}

function editMeal() {
  router.push({ name: 'meal-edit', params: { mealId: props.mealId }, query: { date: scheduledDate.value } })
}

async function toggleCompleted(event) {
  await mealStore.setMealCompleted(props.mealId, event.target.checked)
}

function requestDelete() {
  deleteError.value = ''
  isConfirmingDelete.value = true
}

async function confirmDelete() {
  isDeleting.value = true
  deleteError.value = ''

  try {
    await mealStore.deleteMeal(props.mealId)
    isConfirmingDelete.value = false
    goBack()
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Could not delete meal.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <section v-if="!meal" class="content">
    <p class="form-error">Meal not found.</p>
    <button class="secondary-action" type="button" @click="goBack"><ArrowLeft :size="18" /> Back to meals</button>
  </section>

  <section v-else class="content workout-detail">
    <header class="detail-topbar">
      <button class="icon-action" type="button" aria-label="Back to meals" @click="goBack">
        <ArrowLeft :size="20" />
      </button>
      <div>
        <p class="eyebrow">{{ meal.mealType }}{{ scheduledDate ? ` · ${scheduledDate}` : '' }}</p>
        <h1>{{ meal.name }}</h1>
      </div>
    </header>

    <section class="form-section meal-detail-ingredients">
      <button type="button" class="section-toggle" :aria-expanded="isSectionExpanded('ingredients')" @click="toggleSection('ingredients')">
        <h2>Ingredients</h2>
        <ChevronDown v-if="isSectionExpanded('ingredients')" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>
      <ul v-if="isSectionExpanded('ingredients')" class="exercise-list">
        <li v-for="ingredient in meal.ingredients" :key="ingredient.id" class="exercise-list-row">
          <Flame :size="16" />
          <span>{{ ingredient.name }}</span>
          <span>{{ ingredient.quantity }}{{ ingredient.unit ? ` ${ingredient.unit}` : '' }}</span>
        </li>
      </ul>
    </section>

    <section v-if="meal.instructions?.length" class="form-section meal-detail-instructions">
      <button type="button" class="section-toggle" :aria-expanded="isSectionExpanded('instructions')" @click="toggleSection('instructions')">
        <h2>Instructions</h2>
        <ChevronDown v-if="isSectionExpanded('instructions')" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>
      <div v-if="isSectionExpanded('instructions')" class="meal-instructions">
        <div v-for="(section, sectionIndex) in meal.instructions" :key="sectionIndex" class="meal-instruction-section">
          <h3 v-if="section.heading">{{ section.heading }}</h3>
          <ol>
            <li v-for="(step, stepIndex) in section.steps" :key="stepIndex">{{ step }}</li>
          </ol>
        </div>
      </div>
    </section>

    <section v-if="meal.notes" class="form-section meal-detail-notes">
      <button type="button" class="section-toggle" :aria-expanded="isSectionExpanded('notes')" @click="toggleSection('notes')">
        <h2>Notes</h2>
        <ChevronDown v-if="isSectionExpanded('notes')" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>
      <p v-if="isSectionExpanded('notes')">{{ meal.notes }}</p>
    </section>

    <section class="form-section meal-detail-nutrition">
      <button type="button" class="section-toggle" :aria-expanded="isSectionExpanded('nutrition')" @click="toggleSection('nutrition')">
        <h2>Nutrition</h2>
        <ChevronDown v-if="isSectionExpanded('nutrition')" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>
      <div v-if="isSectionExpanded('nutrition')" class="exercise-stats">
        <div>
          <span>{{ meal.servings }}</span>
          <p>Servings</p>
        </div>
        <div>
          <span>{{ meal.prepMinutes }}m</span>
          <p>Prep time</p>
        </div>
        <div>
          <span>{{ meal.calories ?? '—' }}</span>
          <p>Calories</p>
        </div>
        <div>
          <span>{{ meal.proteinG ?? '—' }}g</span>
          <p>Protein</p>
        </div>
        <div v-if="meal.carbsG !== undefined">
          <span>{{ meal.carbsG }}g</span>
          <p>Carbs</p>
        </div>
        <div v-if="meal.fatG !== undefined">
          <span>{{ meal.fatG }}g</span>
          <p>Fat</p>
        </div>
      </div>
    </section>

    <footer class="modal-footer meal-detail-actions">
      <label class="secondary-action">
        <input type="checkbox" :checked="meal.status === 'completed'" @change="toggleCompleted" />
        <Check :size="18" /> Eaten
      </label>
      <button class="secondary-action" type="button" @click="editMeal"><Pencil :size="18" /> Edit</button>
      <button class="secondary-action danger-action" type="button" @click="requestDelete"><Trash2 :size="18" /> Delete</button>
    </footer>

    <ConfirmDeleteModal
      v-if="isConfirmingDelete"
      :meal-name="meal.name"
      :is-deleting="isDeleting"
      :error="deleteError"
      @cancel="isConfirmingDelete = false"
      @confirm="confirmDelete"
    />
  </section>
</template>
