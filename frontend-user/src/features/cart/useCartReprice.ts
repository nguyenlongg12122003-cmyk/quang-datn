import { useEffect, useRef } from 'react'
import { catalogApi } from '@/lib/api/endpoints/catalog'
import { useApprovedBusinessPricing } from '@/features/business/useApprovedBusinessPricing'
import { useCartStore } from '@/stores/cart-store'

function cartFingerprint(items: ReturnType<typeof useCartStore.getState>['items']) {
  return items.map((i) => `${i.lineId}:${i.quantity}:${i.packagingUnit ?? ''}`).join('|')
}

export function useCartReprice() {
  const items = useCartStore((s) => s.items)
  const repriceItems = useCartStore((s) => s.repriceItems)
  const { hasB2BAccess, customerType: b2bType } = useApprovedBusinessPricing()
  const customerType = hasB2BAccess ? b2bType : 'retail'
  const lastRun = useRef('')

  useEffect(() => {
    if (items.length === 0) return

    const productIds = [...new Set(items.map((i) => i.productId))]
    const fingerprint = `${customerType}::${cartFingerprint(items)}::${productIds.join(',')}`
    if (fingerprint === lastRun.current) return
    lastRun.current = fingerprint

    let cancelled = false
    catalogApi
      .getProductsByIds(productIds)
      .then((products) => {
        if (!cancelled) repriceItems(products, customerType)
      })
      .catch(() => {
        lastRun.current = ''
      })

    return () => {
      cancelled = true
    }
  }, [items, customerType, repriceItems])
}