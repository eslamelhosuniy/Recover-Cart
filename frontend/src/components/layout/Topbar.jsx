import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const PAGE_TITLES = {
  '/dashboard': { title: 'لوحة القيادة', subtitle: 'نظرة عامة على أداء متجرك' },
  '/carts':     { title: 'السلات المهجورة', subtitle: 'تتبع وإدارة السلات غير المكتملة' },
  '/carts/recovered': { title: 'سلات تم شرائها', subtitle: 'تفاصيل السلات المسترجعة بنجاح' },
  '/messages':  { title: 'رسائل واتساب', subtitle: 'سجل الرسائل المرسلة' },
  '/customers': { title: 'العملاء', subtitle: 'قائمة عملائك المسجلين' },
  '/settings':  { title: 'الإعدادات', subtitle: 'إعدادات المتجر والنظام' },
  '/stores':    { title: 'المتاجر', subtitle: 'إدارة متاجر السلات واسترجاعها' },
  '/admin-stores': { title: 'متاجر المنصة', subtitle: 'إدارة متاجر المنصة بالكامل' },
  '/registered-customers': { title: 'المستخدمين والمدراء', subtitle: 'إدارة مستخدمي ومسؤولي النظام' },
}

export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { title, subtitle } = PAGE_TITLES[pathname] || { title: 'Recover', subtitle: '' }
  const { stores, activeStore, switchStore } = useAuth()

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="القائمة">
          <span /><span /><span />
        </button>
        <div className="topbar-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      
      {activeStore && (
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
          <span className="store-selector-label" style={{
            color: 'var(--text-muted, #9ca3af)',
            fontSize: '0.85rem',
            fontWeight: '600',
            fontFamily: 'Cairo, sans-serif'
          }}>
            المتجر الحالي:
          </span>
          <div className="store-selector-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-store" style={{
              position: 'absolute',
              right: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.85rem',
              color: 'var(--primary-color, #a855f7)',
              pointerEvents: 'none'
            }} />
            <select
              value={activeStore.id}
              onChange={(e) => switchStore(e.target.value)}
              className="store-select-dropdown"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.45rem 1rem 0.45rem 2.2rem',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
                minWidth: '180px',
                textAlign: 'left',
                direction: 'ltr',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none'
              }}
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id} style={{ background: '#1c1c1e', color: '#fff' }}>
                  {store.store_name}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down" style={{
              position: 'absolute',
              left: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.4)',
              pointerEvents: 'none'
            }} />
          </div>
        </div>
      )}

      {!activeStore && (
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
          <Link
            to="/stores"
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontFamily: 'Cairo, sans-serif',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)'
            }}
          >
            <i className="fa-solid fa-plus" />
            إنشئ متجر
          </Link>
        </div>
      )}
    </header>
  )
}

