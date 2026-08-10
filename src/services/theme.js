import { getApiUrl } from '../config'

export const DEFAULT_THEME = {
  '--background': 'radial-gradient(circle at top, #0f172a, #020617 70%)',
  '--primary': '#2563eb',
  '--primary-hover': '#1d4ed8',
  '--secondary': '#6b7280',
  '--secondary-hover': '#4b5563',
  '--success': '#22c55e',
  '--success-hover': '#166534',
  '--info': '#38bdf8',
  '--info-hover': '#0284c7',
  '--warning': '#eab308',
  '--warning-hover': '#ca8a04',
  '--danger': '#ef4444',
  '--danger-hover': '#dc2626',
  '--bg-card': '#0f172a',
  '--text': '#fcfbfb',
  '--text-muted': '#666666',
  '--border': '#16347c'
}

export function applyTheme(vars) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const merged = { ...DEFAULT_THEME, ...(vars || {}) }
  Object.entries(merged).forEach(([key, value]) => {
    if (value) root.style.setProperty(key, value)
  })
}

export async function loadAndApplyTheme() {
  try {
    const res = await fetch(`${getApiUrl()}/api/pengaturan_tema`)
    const data = await res.json()
    if (data.success && data.data) {
      applyTheme(data.data)
      return data.data
    }
    applyTheme(DEFAULT_THEME)
    return DEFAULT_THEME
  } catch (err) {
    console.error(err)
    applyTheme(DEFAULT_THEME)
    return DEFAULT_THEME
  }
}
