'use client'

import { useState, useEffect } from 'react'
import { useThemeStore, THEMES } from '@/lib/theme-store'
import { ThemeSelector } from '@/components/ThemeSelector'

export default function Home() {
  const { theme, setTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Staggered animation
    setTimeout(() => setIsLoaded(true), 100)
  }, [])

  return (
    <main className={`main-container ${isLoaded ? 'loaded' : ''}`}>
      <header className="header">
        <div className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">LifeOS</span>
        </div>
        
        <div className="header-actions">
          <button className="btn-ghost">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            About
          </button>
          <ThemeSelector variant="button-bar" showLabels />
        </div>
      </header>

      <section className="hero">
        <div className="hero-badge">✨ Coming Soon</div>
        
        <h1 className="hero-title">
          Plan with <span className="title-accent">Purpose</span>
        </h1>
        
        <p className="hero-subtitle">
          A principle-based planning system that helps you align daily actions 
          with what truly matters. Built on Franklin Covey's timeless methodology.
        </p>

        <div className="hero-features">
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <span className="feature-text">Big Rocks First</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📋</span>
            <span className="feature-text">Weekly Planning</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📝</span>
            <span className="feature-text">Bullet Journal</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <span className="feature-text">Track Progress</span>
          </div>
        </div>

        <div className="hero-cta">
          <button className="btn-primary">
            Join Early Access
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="btn-secondary">
            Learn More
          </button>
        </div>
      </section>

      <section className="preview-section">
        <div className="preview-header">
          <h2 className="preview-title">A Glimpse Inside</h2>
          <p className="preview-subtitle">Designed for clarity, intentionality, and progress</p>
        </div>

        <div className="preview-grid">
          <div className="preview-card">
            <div className="card-icon">🗓️</div>
            <h3 className="card-title">Weekly View</h3>
            <p className="card-desc">Plan your week with intentional Big Rocks first. See your time at a glance.</p>
          </div>
          
          <div className="preview-card">
            <div className="card-icon">⚡</div>
            <h3 className="card-title">Energy Tracking</h3>
            <p className="card-desc">Match tasks to your energy levels. Work smarter, not harder.</p>
          </div>
          
          <div className="preview-card">
            <div className="card-icon">📝</div>
            <h3 className="card-title">Quick Log</h3>
            <p className="card-desc">Rapid logging with bullet journal style. Capture thoughts instantly.</p>
          </div>
          
          <div className="preview-card">
            <div className="card-icon">📈</div>
            <h3 className="card-title">Progress Insights</h3>
            <p className="card-desc">See your wins and stay motivated with visual feedback.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p className="footer-text">Built with care for intentional living.</p>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>

      <style jsx global>{`
        @import url('../styles/themes.css');
        @import url('../styles/theme-selector.css');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: var(--font-sans);
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: background var(--transition-normal), color var(--transition-normal);
          min-height: 100vh;
        }
        
        .main-container {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease;
        }
        
        .main-container.loaded {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .logo-icon {
          font-size: 24px;
          color: var(--accent-primary);
        }
        
        .logo-text {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .btn-ghost {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 14px;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }
        
        .btn-ghost:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }
        
        /* Hero */
        .hero {
          text-align: center;
          padding: 60px 24px 80px;
          max-width: 720px;
          margin: 0 auto;
        }
        
        .hero-badge {
          display: inline-block;
          padding: 6px 14px;
          background: var(--accent-primary);
          color: var(--text-inverse);
          font-size: 12px;
          font-weight: 600;
          border-radius: var(--radius-full);
          margin-bottom: 24px;
          animation: fadeInUp 0.6s ease 0.1s backwards;
        }
        
        .hero-title {
          font-size: clamp(36px, 6vw, 56px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1px;
          margin-bottom: 20px;
          animation: fadeInUp 0.6s ease 0.2s backwards;
        }
        
        .title-accent {
          color: var(--accent-primary);
        }
        
        .hero-subtitle {
          font-size: 18px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 36px;
          animation: fadeInUp 0.6s ease 0.3s backwards;
        }
        
        .hero-features {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 40px;
          animation: fadeInUp 0.6s ease 0.4s backwards;
        }
        
        .feature {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--bg-secondary);
          border-radius: var(--radius-full);
        }
        
        .feature-icon {
          font-size: 16px;
        }
        
        .feature-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        
        .hero-cta {
          display: flex;
          justify-content: center;
          gap: 14px;
          animation: fadeInUp 0.6s ease 0.5s backwards;
        }
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: var(--accent-primary);
          color: var(--text-inverse);
          border: none;
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .btn-primary:hover {
          background: var(--accent-primary-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .btn-secondary {
          padding: 14px 28px;
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .btn-secondary:hover {
          background: var(--bg-secondary);
          border-color: var(--text-muted);
        }
        
        /* Preview Section */
        .preview-section {
          padding: 80px 24px 100px;
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .preview-header {
          text-align: center;
          margin-bottom: 48px;
        }
        
        .preview-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .preview-subtitle {
          font-size: 16px;
          color: var(--text-muted);
        }
        
        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        
        .preview-card {
          padding: 28px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          transition: all var(--transition-normal);
        }
        
        .preview-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent-primary);
        }
        
        .card-icon {
          font-size: 28px;
          margin-bottom: 16px;
        }
        
        .card-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .card-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          padding: 32px;
          border-top: 1px solid var(--border-subtle);
        }
        
        .footer-text {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 24px;
        }
        
        .footer-links a {
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        
        .footer-links a:hover {
          color: var(--text-primary);
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 640px) {
          .header {
            padding: 16px 20px;
          }
          
          .hero {
            padding: 40px 20px 60px;
          }
          
          .hero-features {
            gap: 12px;
          }
          
          .feature {
            padding: 8px 12px;
          }
          
          .hero-cta {
            flex-direction: column;
          }
          
          .preview-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}