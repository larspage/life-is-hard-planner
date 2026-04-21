'use client'

import { useThemeStore, THEMES, type ThemeName } from '@/lib/theme-store'
import { useEffect, useState } from 'react'

interface ThemeSelectorProps {
  variant?: 'dropdown' | 'button-bar' | 'floating'
  showLabels?: boolean
}

export function ThemeSelector({ variant = 'dropdown', showLabels = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useThemeStore()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  if (variant === 'floating') {
    return (
      <div className="theme-selector-floating">
        <button
          className="theme-float-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Change theme"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="theme-float-panel">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-option ${theme === t.id ? 'active' : ''}`}
                onClick={() => {
                  setTheme(t.id)
                  setIsOpen(false)
                }}
              >
                <div className="theme-preview">
                  {t.preview.map((color, i) => (
                    <span key={i} className="preview-dot" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="theme-name">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'button-bar') {
    return (
      <div className="theme-selector-bar">
        <span className="theme-bar-label">Theme:</span>
        <div className="theme-buttons">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-btn ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
              title={t.description}
            >
              <span className="btn-preview">
                {t.preview.map((color, i) => (
                  <span key={i} className="preview-dot" style={{ backgroundColor: color }} />
                ))}
              </span>
              {showLabels && <span className="btn-label">{t.name}</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Default dropdown
  return (
    <div className="theme-selector-dropdown">
      <button
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="trigger-preview">
          {THEMES.find(t => t.id === theme)?.preview.map((color, i) => (
            <span key={i} className="preview-dot" style={{ backgroundColor: color }} />
          ))}
        </span>
        <span className="trigger-name">{THEMES.find(t => t.id === theme)?.name}</span>
        <svg className="trigger-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
          <div className="dropdown-panel">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`dropdown-option ${theme === t.id ? 'active' : ''}`}
                onClick={() => {
                  setTheme(t.id)
                  setIsOpen(false)
                }}
              >
                <div className="option-preview">
                  {t.preview.map((color, i) => (
                    <span key={i} className="preview-dot" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="option-info">
                  <span className="option-name">{t.name}</span>
                  <span className="option-desc">{t.description}</span>
                </div>
                {theme === t.id && (
                  <svg className="option-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}