import { useLocation, Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Topbar.module.css'

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
  '/documentation': { title: 'مركز التوثيق', subtitle: 'شروحات شاملة وخطوة بخطوة' },
}

export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { title, subtitle } = PAGE_TITLES[pathname] || { title: 'Recover', subtitle: '' }
  const { stores, activeStore, switchStore } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (name) => {
    if (!name) return ''
    return name.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase()
  }

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
          <div ref={wrapperRef} className="store-selector-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={styles.storeSelectorTrigger}
            >
              <div className={styles.avatar}>{getInitials(activeStore.store_name)}</div>
              <div className={styles.storeName}>{activeStore.store_name}</div>
              <i className={`fa-solid fa-chevron-down ${styles.chevron}`} />
            </button>

            {open && (
              <ul role="listbox" aria-label="stores" className={styles.dropdownList}>
                {stores.map(store => (
                  <li
                    key={store.id}
                    role="option"
                    aria-selected={store.id === activeStore.id}
                    onClick={() => { switchStore(store.id); setOpen(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { switchStore(store.id); setOpen(false) } }}
                    tabIndex={0}
                    className={store.id === activeStore.id ? `${styles.dropdownItem} ${styles.active}` : styles.dropdownItem}
                  >
                    <div className={styles.dropdownAvatar}>{getInitials(store.store_name)}</div>
                    <div className={styles.dropdownName}>{store.store_name}</div>
                    {store.id === activeStore.id && <i className={`fa-solid fa-check ${styles.dropdownCheck}`} />}
                  </li>
                ))}
              </ul>
            )}
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

