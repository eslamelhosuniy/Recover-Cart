import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import styles from './DocCard.module.css'

export default function DocCard({ section, isSmall = false }) {
  const { language } = useLanguage()
  const isArabic = language === 'ar'

  return (
    <Link
      to={`/documentation/${section.id}`}
      className={`${styles.card} ${isSmall ? styles.small : ''}`}
    >
      <div className={styles.iconWrapper} style={{ backgroundColor: section.color + '20' }}>
        <i className={`${section.icon === 'fa-whatsapp' ? 'fa-brands' : 'fa-solid'} ${section.icon}`} style={{ color: section.color }}></i>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{section.title}</h3>
        <p className={styles.description}>{section.description}</p>
        <div className={styles.footer}>
          <span className={styles.stepsCount}>
            {section.steps.length} {isArabic ? 'خطوة' : 'steps'}
          </span>
          <i className={`fa-solid fa-arrow-${isArabic ? 'left' : 'right'}`}></i>
        </div>
      </div>
    </Link>
  )
}
