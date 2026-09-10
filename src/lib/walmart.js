export function walmartItemId(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !['walmart.com', 'www.walmart.com'].includes(url.hostname)) return ''
    return url.pathname.match(/^\/ip\/(?:[^/]+\/)?(\d+)\/?$/)?.[1] ?? ''
  } catch {
    return ''
  }
}

export function walmartCartUrl(products) {
  const quantities = new Map()
  for (const { url, quantity } of products) {
    const id = walmartItemId(url)
    if (!id || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1) return ''
    quantities.set(id, (quantities.get(id) ?? 0) + Number(quantity))
  }
  if (!quantities.size) return ''
  const url = new URL('https://www.walmart.com/sc/cart/addToCart')
  url.searchParams.set('items', [...quantities].map(([id, quantity]) => `${id}_${quantity}`).join(','))
  return url.toString()
}
