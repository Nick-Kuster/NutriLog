<script setup>
import { computed, ref, watch } from 'vue'
import { walmartItemId, walmartReviewRows, walmartReviewState } from '../lib/walmart'

const props = defineProps({ items: { type: Array, required: true } })
const reviewing = ref(false)
const rows = ref([])
// Keep edits while removing groceries that have since been checked off.
watch(() => props.items, (items) => { rows.value = walmartReviewRows(items, rows.value) })
function review() {
  rows.value = walmartReviewRows(props.items, rows.value)
  reviewing.value = true
}
const cart = computed(() => walmartReviewState(rows.value))
</script>

<template>
  <section v-if="items.length" class="form-section walmart-cart">
    <button v-if="!reviewing" class="secondary-action" type="button" @click="review">Review Walmart cart</button>
    <p class="form-section-hint">All groceries you still need are selected by default. Owned and other checked items are excluded.</p>
    <div v-if="reviewing">
      <h2>Review Walmart products</h2>
      <p>Check package sizes and counts, which start at 1. Opens Walmart in this tab; you may need to sign in. Sending the same items again may add them again.</p>
      <div class="walmart-cart-summary" aria-live="polite">
        <p>{{ cart.selected.length }} selected · {{ cart.matched.length }} with product links.</p>
        <p v-if="cart.missing.length">{{ cart.missing.length }} selected item(s) still need Walmart product links and won't be sent: {{ cart.missing.map(row => row.name).join(', ') }}.</p>
        <p v-if="cart.invalidCounts.length" class="form-error">Enter a whole package count of 1 or more for: {{ cart.invalidCounts.map(row => row.name).join(', ') }}.</p>
        <a v-if="cart.url" class="secondary-action" :href="cart.url">Add {{ cart.matched.length }} item(s) to Walmart cart</a>
        <button v-else class="secondary-action" type="button" disabled>Add to Walmart cart</button>
        <p v-if="!cart.matched.length">{{ cart.selected.length ? 'Use Find on Walmart below and paste product links to enable the cart button.' : 'Select at least one grocery item.' }}</p>
      </div>
      <article v-for="row in rows" :key="row.reviewKey" class="walmart-product">
        <label><input v-model="row.selected" type="checkbox" /> {{ row.name }} — {{ row.quantity }} {{ row.unit }}</label>
        <a :href="`https://www.walmart.com/search?q=${encodeURIComponent(row.name)}`" target="_blank" rel="noopener noreferrer">Find on Walmart</a>
        <label>Walmart product link<input v-model="row.url" type="url" placeholder="https://www.walmart.com/ip/…" /></label>
        <p v-if="!walmartItemId(row.url)" class="form-section-hint">Paste a Walmart product link to include this item.</p>
        <a v-else :href="row.url" target="_blank" rel="noopener noreferrer">Check product and package size</a>
        <label>Packages<input v-model.number="row.packages" type="number" min="1" step="1" /></label>
      </article>
      <p>Product links entered here apply to this review only; save them in the meal editor to reuse them.</p>
      <button class="secondary-action" type="button" @click="reviewing = false">Close review</button>
    </div>
  </section>
</template>

<style scoped>
.walmart-cart { margin-block: 1rem; }
.walmart-product { display: grid; gap: .6rem; padding-block: 1rem; border-bottom: 1px solid var(--border, #ddd); }
.walmart-product label { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.walmart-product input[type=url] { width: 100%; min-width: 0; }
.walmart-product input[type=number] { width: 5rem; }
</style>
