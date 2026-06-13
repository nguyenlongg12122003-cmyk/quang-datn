import { useCallback, useRef, useState } from 'react'

const MIN_REFRESH_SPIN_MS = 500

type RefetchFn = (options?: { cancelRefetch?: boolean }) => Promise<unknown>

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useAdminListRefetch(refetch: RefetchFn) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return

    refreshingRef.current = true
    setIsRefreshing(true)

    const startedAt = Date.now()
    try {
      await refetch({ cancelRefetch: false })
    } finally {
      const elapsed = Date.now() - startedAt
      const remaining = MIN_REFRESH_SPIN_MS - elapsed
      if (remaining > 0) {
        await wait(remaining)
      }
      refreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [refetch])

  return { refresh, isRefreshing }
}