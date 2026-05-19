import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const cartSubItems = [
  { to: '/carts', icon: 'fa-cart-shopping', label: 'إدارة السلات', exact: true },
  { to: '/carts/recovered', icon: 'fa-bag-shopping', label: 'سلات تم شرائها' },
  { to: '/messages', icon: 'fa-comment-dots', label: 'رسائل الواتساب' },
  { to: '/customers', icon: 'fa-users', label: 'العملاء' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine if any of the sub-items inside "السلات" is active
  const isCartActive = cartSubItems.some(item => {
    if (item.exact) {
      return location.pathname === item.to
    }
    return location.pathname.startsWith(item.to)
  })

  const [cartsDropdownOpen, setCartsDropdownOpen] = useState(isCartActive)

  // Keep dropdown open if the active route is one of the sub-items
  useEffect(() => {
    if (isCartActive) {
      setCartsDropdownOpen(true)
    }
  }, [isCartActive])

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
          {/* Main Dashboard item */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            onClick={onClose}
          >
            <i className="fa-solid fa-chart-line nav-icon" />
            <span>لوحة القيادة</span>
          </NavLink>

          {/* Carts Dropdown Trigger */}
          <button
            type="button"
            className={`sidebar-dropdown-toggle ${isCartActive ? 'active' : ''}`}
            onClick={() => setCartsDropdownOpen(!cartsDropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '.9rem' }}>
              <i className="fa-solid fa-folder-open nav-icon" style={{ fontSize: '1.1rem', minWidth: '22px', textAlign: 'center' }} />
              <span>السلات المهجورة</span>
            </span>
            <i
              className="fa-solid fa-chevron-down"
              style={{
                fontSize: '.75rem',
                marginRight: 'auto',
                transition: 'transform 0.2s ease',
                transform: cartsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            />
          </button>

          {/* Carts Dropdown Menu */}
          {cartsDropdownOpen && (
            <div className="sidebar-dropdown-menu">
              {cartSubItems.map(({ to, icon, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <i className={`fa-solid ${icon}`} style={{ fontSize: '0.95rem' }} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* Administrative Panel section header & item */}
          {user && user.is_admin && (
            <>
              <div className="sidebar-section-title">لوحة الإدارة</div>
              <NavLink
                to="/registered-customers"
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                onClick={onClose}
              >
                <i className="fa-solid fa-user-shield nav-icon" />
                <span>العملاء المسجلون لدينا</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User info + logout + settings */}
        <div className="sidebar-footer">
          {user && (
            <div style={{ padding: '0 1.1rem', marginBottom: '.75rem' }}>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.1rem' }}>
                مرحباً
              </div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                {user.username}
                {user.is_admin ? (
                  <span className="badge badge-accent" style={{ fontSize: '.65rem', padding: '.15rem .5rem' }}>
                    أدمن
                  </span>
                ) : (
                  <span className="badge badge-info" style={{ fontSize: '.65rem', padding: '.15rem .5rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                    متجر
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Settings NavLink moved to footer */}
          <NavLink
            to="/settings"
            className={({ isActive }) => isActive ? 'footer-nav-item active' : 'footer-nav-item'}
            style={{ display: 'flex', alignItems: 'center', gap: '.9rem', padding: '.85rem 1.1rem', textDecoration: 'none' }}
            onClick={onClose}
          >
            <i className="fa-solid fa-gear nav-icon" style={{ fontSize: '1.1rem', minWidth: '22px', textAlign: 'center' }} />
            <span>الإعدادات</span>
          </NavLink>

          <button className="logout-btn" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket nav-icon" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}
