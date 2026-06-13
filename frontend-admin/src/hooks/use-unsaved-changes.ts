import { useCallback, useEffect } from 'react'

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true
    return window.confirm('Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?')
  }, [isDirty])

  return { confirmLeave, isDirty }
}