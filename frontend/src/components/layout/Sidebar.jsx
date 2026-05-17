import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: 'fa-chart-line',       label: 'لوحة القيادة' },
  { to: '/carts',     icon: 'fa-cart-shopping',    label: 'السلات المهجورة' },
  { to: '/messages',  icon: 'fa-comment-dots',     label: 'رسائل واتساب' },
  { to: '/customers', icon: 'fa-users',            label: 'العملاء' },
  { to: '/registered-customers', icon: 'fa-user-shield', label: 'العملاء المسجلون لدينا', adminOnly: true },
  { to: '/settings',  icon: 'fa-gear',             label: 'الإعدادات' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/signin')
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <i className="fa-solid fa-cart-shopping" />
          </div>
          <div className="sidebar-logo-text">
            Re<span>cover</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems
            .filter(({ adminOnly }) => !adminOnly || (user && user.is_admin))
            .map(({ to, icon, label }) => (
              <NavLink key={to} to={to} onClick={onClose}>
                <i className={`fa-solid ${icon} nav-icon`} />
                {label}
              </NavLink>
            ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          {user && (
            <div style={{ padding: '.5rem 1.1rem', marginBottom: '.5rem' }}>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.1rem' }}>
                مرحباً
              </div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                {user.username}
                {user.is_admin && (
                  <span className="badge badge-accent" style={{ fontSize: '.65rem', padding: '.15rem .5rem' }}>
                    أدمن
                  </span>
                )}
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket nav-icon" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}
