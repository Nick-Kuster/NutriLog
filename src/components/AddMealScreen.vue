<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-vue-next'
import { GROCERY_CATEGORIES } from '../lib/groceryCategories'
import { useMealStore } from '../stores/meals'
import { useScheduleStore } from '../stores/schedule'

const props = defineProps({
  mealId: { type: [Number, String], default: null },
  scheduledDate: { type: String, default: '' },
})

const router = useRouter()
const scheduleStore = useScheduleStore()
const mealStore = useMealStore()

const addMealError = ref('')
const existingMeal = computed(() => (props.mealId ? mealStore.mealById(props.mealId) : null))
const isEditing = computed(() => Boolean(existingMeal.value))
const mealDraft = ref(existingMeal.value ? createMealDraftFromMeal(existingMeal.value, props.scheduledDate) : createMealDraft())

const mealTypeOptions = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Meal']

function todayIsoDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createMealDraft() {
  return {
    name: '',
    date: todayIsoDate(),
    mealType: 'Meal',
    servings: 1,
    prepMinutes: 15,
    calories: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
    notes: '',
    ingredients: [createIngredientDraft()],
  }
}

function createMealDraftFromMeal(meal, scheduledDate) {
  return {
    name: meal.name ?? '',
    date: scheduledDate || todayIsoDate(),
    mealType: meal.mealType ?? 'Meal',
    servings: meal.servings ?? 1,
    prepMinutes: meal.prepMinutes ?? 15,
    calories: meal.calories ?? '',
    proteinG: meal.proteinG ?? '',
    carbsG: meal.carbsG ?? '',
    fatG: meal.fatG ?? '',
    notes: meal.notes ?? '',
    ingredients: meal.ingredients?.length ? meal.ingredients.map(createIngredientDraftFromIngredient) : [createIngredientDraft()],
  }
}

function createIngredientDraft() {
  return {
    id: makeId(),
    name: '',
    quantity: 1,
    unit: '',
    category: 'Other',
  }
}

function createIngredientDraftFromIngredient(ingredient) {
  return {
    id: makeId(),
    name: ingredient.name ?? '',
    quantity: ingredient.quantity ?? 1,
    unit: ingredient.unit ?? '',
    category: ingredient.category ?? 'Other',
  }
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function addIngredient() {
  mealDraft.value.ingredients = [...mealDraft.value.ingredients, createIngredientDraft()]
}

function removeIngredient(ingredientId) {
  if (mealDraft.value.ingredients.length === 1) {
    mealDraft.value.ingredients = [createIngredientDraft()]
    return
  }

  mealDraft.value.ingredients = mealDraft.value.ingredients.filter((ingredient) => ingredient.id !== ingredientId)
}

function mapIngredientDraft(ingredientDraft, index) {
  const quantity = Number(ingredientDraft.quantity)

  return {
    id: makeId(),
    name: ingredientDraft.name.trim() || `Ingredient ${index + 1}`,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit: ingredientDraft.unit.trim(),
    category: ingredientDraft.category || 'Other',
  }
}

function goBack() {
  if (isEditing.value) {
    router.push({ name: 'meal', params: { mealId: props.mealId } })
  } else {
    router.push({ name: 'meals' })
  }
}

async function saveMeal() {
  addMealError.value = ''

  const draft = mealDraft.value
  const name = draft.name.trim() || 'New Meal'
  const scheduledDate = draft.date || props.scheduledDate || todayIsoDate()

  const mealId = isEditing.value ? existingMeal.value.id : makeId()
  const meal = {
    id: mealId,
    name,
    mealType: draft.mealType || 'Meal',
    servings: Number(draft.servings) > 0 ? Number(draft.servings) : 1,
    prepMinutes: Number(draft.prepMinutes) >= 0 ? Number(draft.prepMinutes) : 0,
    calories: draft.calories === '' ? undefined : Number(draft.calories),
    proteinG: draft.proteinG === '' ? undefined : Number(draft.proteinG),
    carbsG: draft.carbsG === '' ? undefined : Number(draft.carbsG),
    fatG: draft.fatG === '' ? undefined : Number(draft.fatG),
    status: existingMeal.value?.status ?? 'planned',
    notes: draft.notes.trim(),
    ingredients: draft.ingredients.map(mapIngredientDraft),
  }

  try {
    const savedMeal = isEditing.value
      ? await mealStore.updateMeal(meal.id, meal)
      : await mealStore.addMeal(meal)

    if (!savedMeal) return

    if (isEditing.value) {
      await scheduleStore.updateScheduledMeal(props.scheduledDate, savedMeal.id, scheduledDate)
      router.push({ name: 'meal', params: { mealId: savedMeal.id } })
    } else {
      await scheduleStore.scheduleMeal(scheduledDate, savedMeal.id)
      router.push({ name: 'meals', query: { date: scheduledDate } })
    }
  } catch (error) {
    addMealError.value = error instanceof Error ? error.message : 'Could not save meal.'
  }
}
</script>

<template>
  <section class="content">
    <header class="detail-topbar">
      <button class="icon-action" type="button" aria-label="Back to meals" @click="goBack">
        <ArrowLeft :size="20" />
      </button>
      <div>
        <p class="eyebrow">{{ isEditing ? 'Edit meal' : 'New meal' }}</p>
        <h1>{{ isEditing ? 'Edit Meal' : 'Add Meal' }}</h1>
      </div>
    </header>

    <p v-if="addMealError" class="form-error">{{ addMealError }}</p>

    <form novalidate @submit.prevent="saveMeal">
      <section class="form-section">
        <h2>Meal details</h2>
        <div class="form-grid">
          <label class="form-field">
            <span>Meal name</span>
            <input v-model="mealDraft.name" type="text" placeholder="Chicken Stir Fry" />
          </label>
          <label class="form-field">
            <span>Date</span>
            <input v-model="mealDraft.date" type="date" />
          </label>
          <label class="form-field">
            <span>Type</span>
            <select v-model="mealDraft.mealType">
              <option v-for="option in mealTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label class="form-field">
            <span>Servings</span>
            <input v-model.number="mealDraft.servings" type="number" min="1" step="1" />
          </label>
          <label class="form-field">
            <span>Prep time (minutes)</span>
            <input v-model.number="mealDraft.prepMinutes" type="number" min="0" />
          </label>
        </div>
      </section>

      <section class="form-section">
        <h2>Nutrition (optional, per serving)</h2>
        <div class="form-grid">
          <label class="form-field">
            <span>Calories</span>
            <input v-model="mealDraft.calories" type="number" min="0" />
          </label>
          <label class="form-field">
            <span>Protein (g)</span>
            <input v-model="mealDraft.proteinG" type="number" min="0" />
          </label>
          <label class="form-field">
            <span>Carbs (g)</span>
            <input v-model="mealDraft.carbsG" type="number" min="0" />
          </label>
          <label class="form-field">
            <span>Fat (g)</span>
            <input v-model="mealDraft.fatG" type="number" min="0" />
          </label>
        </div>
      </section>

      <section class="form-section">
        <h2>Ingredients</h2>
        <p class="form-section-hint">
          Each ingredient's category groups it on your weekly grocery list.
        </p>

        <div class="exercise-builder">
          <article v-for="(ingredient, index) in mealDraft.ingredients" :key="ingredient.id" class="exercise-draft-row">
            <div class="exercise-draft-main">
              <span class="exercise-draft-index">{{ index + 1 }}</span>
              <input v-model="ingredient.name" class="exercise-draft-name" type="text" :placeholder="`Ingredient ${index + 1} name`" />
              <button class="icon-action" type="button" :aria-label="`Remove ingredient ${index + 1}`" @click="removeIngredient(ingredient.id)">
                <Trash2 :size="16" />
              </button>
            </div>

            <div class="ingredient-draft-detail">
              <input v-model.number="ingredient.quantity" type="number" min="0" step="0.25" aria-label="Quantity" placeholder="Qty" />
              <input v-model="ingredient.unit" type="text" aria-label="Unit" placeholder="unit (cup, g, oz)" />
              <select v-model="ingredient.category" aria-label="Grocery category">
                <option v-for="category in GROCERY_CATEGORIES" :key="category" :value="category">{{ category }}</option>
              </select>
            </div>
          </article>

          <button class="secondary-action" type="button" @click="addIngredient">
            <Plus :size="16" /> Add ingredient
          </button>
        </div>
      </section>

      <section class="form-section">
        <label class="form-field">
          <span>Notes (optional)</span>
          <textarea v-model="mealDraft.notes" rows="3" placeholder="Recipe steps, prep notes, anything to remember"></textarea>
        </label>
      </section>

      <button class="primary-action save-workout-button" type="submit">
        <Check :size="18" /> {{ isEditing ? 'Save Changes' : 'Save Meal' }}
      </button>
    </form>
  </section>
</template>
