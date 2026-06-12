import { useEffect, useState } from 'react'

export interface CountdownValues {
  hours: number
  minutes: number
  seconds: number
  expired: boolean
  totalMs: number
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function formatCountdown(values: CountdownValues) {
  return {
    hours: pad(values.hours),
    minutes: pad(values.minutes),
    seconds: pad(values.seconds),
  }
}

export function useCountdown(target: Date | null): CountdownValues {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target?.getTime()])

  if (!target) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true, totalMs: 0 }
  }

  const totalMs = Math.max(0, target.getTime() - now)
  if (totalMs === 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true, totalMs: 0 }
  }

  const totalSeconds = Math.floor(totalMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, expired: false, totalMs }
}