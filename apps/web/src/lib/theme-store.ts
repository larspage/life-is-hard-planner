import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName = 'default' | 'forest' | 'ocean' | 'sunset' | 'midnight' | 'lavender'

export interface ThemeOption {
  id: ThemeName
  name: string
  description: string
  preview: string[]
}

export const THEMES: ThemeOption[] = [
  {
    id: 'default',
    name: 'Warm Earth',
    description: 'Cozy earth tones with terracotta accents',
    preview: ['#b5714a', '#7c9a6e', '#d4a574'],
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep greens and natural moss',
    preview: ['#4a6b3d', '#7cb078', '#a8c89e'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm blues with soft waves',
    preview: ['#4a6b7a', '#7aa0b0', '#a8c0cc'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges and cozy browns',
    preview: ['#b06b4a', '#b09078', '#ccb8a8'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark and cozy evening tones',
    preview: ['#c4936a', '#7a9a7a', '#a89078'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purples and gentle pastels',
    preview: ['#8b6a9a', '#9a8ab0', '#b8a8cc'],
  },
]

interface ThemeState {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  nextTheme: () => void
  prevTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'default',
      setTheme: (theme) => {
        // Apply theme to document
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme)
        }
        set({ theme })
      },
      nextTheme: () => {
        const current = get().theme
        const idx = THEMES.findIndex(t => t.id === current)
        const nextIdx = (idx + 1) % THEMES.length
        get().setTheme(THEMES[nextIdx].id)
      },
      prevTheme: () => {
        const current = get().theme
        const idx = THEMES.findIndex(t => t.id === current)
        const prevIdx = idx === 0 ? THEMES.length - 1 : idx - 1
        get().setTheme(THEMES[prevIdx].id)
      },
    }),
    {
      name: 'lifeos-theme',
    }
  )
)

// Apply theme on load
if (typeof document !== 'undefined') {
  const stored = localStorage.getItem('lifeos-theme')
  if (stored) {
    try {
      const theme = JSON.parse(stored)?.state?.theme
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme)
      }
    } catch {
      // Ignore parse errors
    }
  }
}