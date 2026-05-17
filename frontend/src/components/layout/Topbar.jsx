import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/dashboard': { title: 'لوحة القيادة', subtitle: 'نظرة عامة على أداء متجرك' },
  '/carts':     { title: 'السلات المهجورة', subtitle: 'تتبع وإدارة السلات غير المكتملة' },
  '/messages':  { title: 'رسائل واتساب', subtitle: 'سجل الرسائل المرسلة' },
  '/customers': { title: 'العملاء', subtitle: 'قائمة عملائك المسجلين' },
  '/settings':  { title: 'الإعدادات', subtitle: 'إعدادات المتجر والنظام' },
}

export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation()
  const { title, subtitle } = PAGE_TITLES[pathname] || { title: 'Recover', subtitle: '' }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="القائمة">
          <span /><span /><span />
        </button>
        <div className="topbar-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}
