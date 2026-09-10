<script setup>
import { computed, ref, watch } from 'vue'
import { walmartCartUrl, walmartItemId } from '../lib/walmart'

const props = defineProps({ items: { type: Array, required: true } })
const reviewing = ref(false)
const rows = ref([])
// Rebuild the review when the grocery list or its checked state changes.
watch(() => props.items, () => { reviewing.value = false; rows.value = [] })
function review() {
  rows.value = props.items.map((item) => ({
    ...item, url: item.walmartUrl || '', packages: 1, selected: Boolean(walmartItemId(item.walmartUrl)),
  }))
  reviewing.value = true
}
const selected = computed(() => rows.value.filter((row) => row.selected))
const cartUrl = computed(() => walmartCartUrl(selected.value.map((row) => ({ url: row.url, quantity: row.packages }))))
</script>

<template>
  <section v-if="items.length" class="form-section walmart-cart">
    <button class="secondary-action" type="button" @click="review">Add to Walmart cart</button>
    <p class="form-section-hint">Opens Walmart. You may need to sign in. Checked items are excluded.</p>
    <div v-if="reviewing">
      <h2>Review Walmart products</h2>
      <p>Choose products and package counts. Counts start at 1; check package sizes against your recipe needs. Opening this link again may add items again.</p>
      <article v-for="row in rows" :key="row.reviewKey" class="walmart-product">
        <label><input v-model="row.selected" type="checkbox" /> {{ row.name }} — {{ row.quantity }} {{ row.unit }}</label>
        <a :href="`https://www.walmart.com/search?q=${encodeURIComponent(row.name)}`" target="_blank" rel="noopener noreferrer">Find on Walmart</a>
        <label>Walmart product link<input v-model="row.url" type="url" placeholder="https://www.walmart.com/ip/…" /></label>
        <p v-if="!walmartItemId(row.url)" class="form-section-hint">Paste a Walmart product link to include this item.</p>
        <a v-else :href="row.url" target="_blank" rel="noopener noreferrer">Check product and package size</a>
        <label>Packages<input v-model.number="row.packages" type="number" min="1" step="1" /></label>
      </article>
      <p>{{ selected.length }} of {{ rows.length }} grocery items selected. Product links entered here apply to this review only; save them in the meal editor to reuse them.</p>
      <a v-if="cartUrl" class="secondary-action" :href="cartUrl" target="_blank" rel="noopener noreferrer">Open Walmart and add selected items</a>
      <p v-else role="status">Select at least one item, with a valid product link and a whole package count of 1 or more.</p>
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
