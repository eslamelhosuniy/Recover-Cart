import { useState } from 'react'
import Breadcrumbs from './Breadcrumbs'
import DocSidebar from './DocSidebar'
import DocLanguageSwitcher from './DocLanguageSwitcher'
import styles from './DocLayout.module.css'

export default function DocLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.container}>
      <DocSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={styles.main}>
        <div className={styles.header}>
          <button
            className={styles.menuToggle}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <DocLanguageSwitcher />
        </div>

        <div className={styles.content}>
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  )
}
