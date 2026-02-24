import { useState, useCallback, type ReactNode } from 'react'

interface NavItem {
  href: string
  icon: string
  label: string
}

const navItems: NavItem[] = [
  { href: './', icon: '\u{1F3E0}', label: 'ホーム' },
  { href: './usage.html', icon: '\u{1F4D6}', label: '使い方' },
  { href: './plugin-dev.html', icon: '\u{1F50C}', label: 'プラグイン開発' },
  { href: './tts.html', icon: '\u{1F508}', label: '読み上げ (TTS)' },
]

function isActive(href: string): boolean {
  const current = location.pathname.split('/').pop() || 'index.html'
  if (href === './' && (current === 'index.html' || current === '')) return true
  return href === current
}

interface LayoutProps {
  title: string
  children: ReactNode
}

export function Layout({ title, children }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const open = useCallback(() => setDrawerOpen(true), [])
  const close = useCallback(() => setDrawerOpen(false), [])

  return (
    <>
      <div className={`scrim${drawerOpen ? ' open' : ''}`} onClick={close} />

      <div className="top-app-bar">
        <button className="leading-icon" aria-label="メニュー" onClick={open}>
          &#9776;
        </button>
        <span className="bar-title">{title}</span>
      </div>

      <div className="page-wrapper">
        <aside className={`nav-drawer${drawerOpen ? ' open' : ''}`}>
          <div className="nav-drawer-header">
            <h2>NicomView</h2>
            <p>ニコ生コメントビューア</p>
          </div>
          <nav>
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={isActive(item.href) ? 'active' : undefined}
                    onClick={close}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav-drawer-footer">
            <a href="https://github.com/Segu-g/nicomview">GitHub</a>
          </div>
        </aside>

        <main className="main-content">
          {children}
          <footer className="site-footer">
            NicomView &mdash; MIT License &mdash;{' '}
            <a href="https://github.com/Segu-g/nicomview">GitHub</a>
          </footer>
        </main>
      </div>
    </>
  )
}
