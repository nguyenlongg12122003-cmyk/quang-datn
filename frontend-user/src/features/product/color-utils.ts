const NAMED_COLORS: Record<string, string> = {
  đỏ: '#ef4444',
  red: '#ef4444',
  xanh: '#3b82f6',
  'xanh dương': '#3b82f6',
  blue: '#3b82f6',
  'xanh lá': '#22c55e',
  green: '#22c55e',
  vàng: '#ca8a04',
  yellow: '#eab308',
  cam: '#f97316',
  orange: '#f97316',
  tím: '#a855f7',
  purple: '#a855f7',
  hồng: '#ec4899',
  pink: '#ec4899',
  đen: '#171717',
  black: '#171717',
  trắng: '#f5f5f5',
  white: '#f5f5f5',
  xám: '#9ca3af',
  gray: '#9ca3af',
  grey: '#9ca3af',
  nâu: '#92400e',
  brown: '#92400e',
  be: '#d6c4a8',
  beige: '#d6c4a8',
  bạc: '#cbd5e1',
  silver: '#cbd5e1',
  gold: '#ca8a04',
}

function hashColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 55% 45%)`
}

export function resolveColorSwatch(name: string): string {
  const normalized = name.trim().toLowerCase()
  if (NAMED_COLORS[normalized]) return NAMED_COLORS[normalized]
  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) return normalized
  return hashColor(normalized)
}

export function isLightSwatch(hexOrHsl: string) {
  if (hexOrHsl.startsWith('hsl')) return false
  const hex = hexOrHsl.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}