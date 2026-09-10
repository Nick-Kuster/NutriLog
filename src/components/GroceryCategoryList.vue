<script setup>
import { computed, ref, watch } from 'vue'
import WalmartCart from './WalmartCart.vue'
import { ChevronDown, ChevronRight, ShoppingCart, Trash2 } from 'lucide-vue-next'
import { useGroceryStore } from '../stores/grocery'

const props = defineProps({
  groups: { type: Array, required: true },
  showRemoveExtra: { type: Boolean, default: true },
})

const groceryStore = useGroceryStore()
const walmartItems = computed(() => props.groups.flatMap((group) => [
  ...group.auto.filter((item) => !groceryStore.isChecked(item.itemKey)).map((item) => ({ ...item, reviewKey: `auto-${item.itemKey}` })),
  ...group.extra.filter((item) => !item.isChecked).map((item) => ({ ...item, reviewKey: `extra-${item.id}` })),
]))
const expandedCategories = ref(new Set())
const hasInitializedExpanded = ref(false)

watch(() => props.groups, (groups) => {
  if (hasInitializedExpanded.value || !groups.length) return
  expandedCategories.value = new Set([groups[0].category])
  hasInitializedExpanded.value = true
}, { immediate: true })

function isExpanded(category) {
  return expandedCategories.value.has(category)
}

function toggleCategory(category) {
  const nextExpanded = new Set(expandedCategories.value)
  if (nextExpanded.has(category)) {
    nextExpanded.delete(category)
  } else {
    nextExpanded.add(category)
  }
  expandedCategories.value = nextExpanded
}
</script>

<template>
  <section class="grocery-list" aria-label="Grocery list by category">
    <WalmartCart :items="walmartItems" />
    <article v-for="group in groups" :key="group.category" class="grocery-category">
      <button
        type="button"
        class="grocery-category-toggle"
        :aria-expanded="isExpanded(group.category)"
        @click="toggleCategory(group.category)"
      >
        <ShoppingCart :size="18" />
        <span>{{ group.category }}</span>
        <em>{{ group.auto.length + group.extra.length }}</em>
        <ChevronDown v-if="isExpanded(group.category)" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>

      <ul v-if="isExpanded(group.category)" class="grocery-item-list">
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
          <button v-if="showRemoveExtra" class="icon-action danger-icon-button" type="button" :aria-label="`Remove ${item.name}`" @click="groceryStore.removeExtraItem(item.id)">
            <Trash2 :size="16" />
          </button>
        </li>
      </ul>
    </article>
  </section>
</template>
