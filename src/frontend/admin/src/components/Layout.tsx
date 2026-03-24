import { useState, useEffect } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchFeedbackNewCount, fetchPreReservationNewCount } from '../api'
import './Layout.css'

export function Layout() {
  const navigate = useNavigate()
  const { user, token, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackNewCount, setFeedbackNewCount] = useState(0)
  const [preResNewCount, setPreResNewCount] = useState(0)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = () => { if (mq.matches) setMenuOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!token || user?.role !== 'Admin') return
    fetchFeedbackNewCount(token).then((r) => setFeedbackNewCount(r.count)).catch(() => {})
    fetchPreReservationNewCount(token).then((r) => setPreResNewCount(r.count)).catch(() => {})
    const t = setInterval(() => {
      fetchFeedbackNewCount(token).then((r) => setFeedbackNewCount(r.count)).catch(() => {})
      fetchPreReservationNewCount(token).then((r) => setPreResNewCount(r.count)).catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [token])

  const adminNavLinks = [
    { to: '/dashboard', label: 'Dashboard', badge: false, badgeType: 'none' as const },
    { to: '/customers', label: 'Müşteriler', badge: false, badgeType: 'none' as const },
    { to: '/coastguard', label: 'Sahil Güvenlik', badge: false, badgeType: 'none' as const },
    { to: '/tour', label: 'Tur Bilgisi', badge: false, badgeType: 'none' as const },
    { to: '/stops', label: 'Duraklar', badge: false, badgeType: 'none' as const },
    { to: '/sms', label: 'SMS', badge: false, badgeType: 'none' as const },
    { to: '/sms-history', label: 'SMS Geçmişi', badge: false, badgeType: 'none' as const },
    { to: '/feedback', label: 'Dilek / İstek / Şikayet', badge: true, badgeType: 'feedback' as const },
    { to: '/survey-reports', label: 'Anket Raporları', badge: false, badgeType: 'none' as const },
    { to: '/pre-reservations', label: 'Ön Rezervasyon Talepleri', badge: true, badgeType: 'preres' as const },
    { to: '/marketing-sales', label: 'Pazarlama Satışları', badge: false, badgeType: 'none' as const },
    { to: '/bilet-kes', label: 'Bilet Kes', badge: false, badgeType: 'none' as const },
    { to: '/biletler', label: 'Biletler', badge: false, badgeType: 'none' as const },
    { to: '/acenta-kaydi', label: 'Acenta Kaydı', badge: false, badgeType: 'none' as const },
    { to: '/acentalar', label: 'Acentalar', badge: false, badgeType: 'none' as const },
    { to: '/users', label: 'Kullanıcılar', badge: false, badgeType: 'none' as const },
    { to: '/settings', label: 'Ayarlar', badge: false, badgeType: 'none' as const },
    { to: '/marketing-settings', label: 'Pazarlama Ayarları', badge: false, badgeType: 'none' as const },
  ]
  const acentaNavLinks = [
    { to: '/agency/dashboard', label: 'Dashboard', badge: false, badgeType: 'none' as const },
    { to: '/agency/new-passenger', label: 'Yeni Yolcu Ekle', badge: false, badgeType: 'none' as const },
    { to: '/agency/passengers', label: 'Yolcular', badge: false, badgeType: 'none' as const },
    { to: '/agency/settings', label: 'Ayarlar', badge: false, badgeType: 'none' as const },
  ]
  const navLinks = user?.role === 'Acenta' ? acentaNavLinks : adminNavLinks

  return (
    <div className="app-layout">
      <header className="app-header">
        <button
          type="button"
          className="app-menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={menuOpen}
        >
          <span className="app-menu-icon" aria-hidden>
            {menuOpen ? (
              <>&#10005;</>
            ) : (
              <>
                <span className="app-menu-bar" />
                <span className="app-menu-bar" />
                <span className="app-menu-bar" />
              </>
            )}
          </span>
        </button>
        <strong className="app-header-title">{user?.role === 'Acenta' ? 'Tekne Turu — Acenta' : 'Tekne Turu — Admin'}</strong>
        <span className="app-header-actions">
          {user && <span className="app-header-user">{user.fullName} ({user.role})</span>}
          <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm app-header-logout">
            Çıkış
          </button>
        </span>
      </header>

      <div
        className={`app-nav-backdrop ${menuOpen ? 'is-open' : ''}`}
        onClick={closeMenu}
        aria-hidden
      />
      <div className="app-body">
        <nav className={`app-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Ana menü">
          <div className="app-nav-inner">
            {navLinks.map(({ to, label, badge, badgeType }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
                onClick={closeMenu}
              >
                <span>{label}</span>
                {badge && (
                  <>
                    {badgeType === 'feedback' && feedbackNewCount > 0 && (
                      <span className="app-nav-badge" aria-label={`${feedbackNewCount} yeni bildirim`}>
                        {feedbackNewCount > 99 ? '99+' : feedbackNewCount}
                      </span>
                    )}
                    {badgeType === 'preres' && preResNewCount > 0 && (
                      <span className="app-nav-badge" aria-label={`${preResNewCount} yeni ön rezervasyon`}>
                        {preResNewCount > 99 ? '99+' : preResNewCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
