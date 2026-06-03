import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { documentationData } from '../../data/documentationData'
import styles from './DocSidebar.module.css'

export default function DocSidebar({ isOpen, onClose }) {
  const { language } = useLanguage()
  const { sectionId } = useParams()
  const data = documentationData[language]
  const isArabic = language === 'ar'

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
        onClick={onClose}
      />

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <Link to="/documentation" className={styles.logo} onClick={onClose}>
            <i className="fa-solid fa-book"></i>
            <span>{isArabic ? 'التوثيق' : 'Documentation'}</span>
          </Link>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <h4 className={styles.navTitle}>
              {isArabic ? 'الرئيسية' : 'Main'}
            </h4>
            <ul className={styles.navList}>
              {data.sections.map(section => (
                <li key={section.id}>
                  <Link
                    to={`/documentation/${section.id}`}
                    className={`${styles.navLink} ${
                      sectionId === section.id ? styles.active : ''
                    }`}
                    onClick={onClose}
                  >
                    <i className={`${section.icon === 'fa-whatsapp' ? 'fa-brands' : 'fa-solid'} ${section.icon}`}></i>
                    <span>{section.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {sectionId && (
            <div className={styles.navSection}>
              <h4 className={styles.navTitle}>
                {isArabic ? 'الخطوات' : 'Steps'}
              </h4>
              <ul className={styles.stepsList}>
                {documentationData[language].sections
                  .find(s => s.id === sectionId)
                  ?.steps.map(step => (
                    <li key={step.number}>
                      <a
                        href={`#step-${step.number}`}
                        className={styles.stepLink}
                        onClick={onClose}
                      >
                        <span className={styles.stepNumber}>{step.number}</span>
                        <span className={styles.stepTitle}>{step.title}</span>
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </nav>

        <div className={styles.footer}>
          <div className={styles.helpText}>
            <i className="fa-solid fa-lightbulb"></i>
            <p>{isArabic ? 'هل تحتاج لمساعدة؟ تواصل معنا' : 'Need help? Contact us'}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
