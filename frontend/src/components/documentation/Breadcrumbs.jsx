import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { documentationData } from '../../data/documentationData'
import styles from './Breadcrumbs.module.css'

export default function Breadcrumbs() {
  const { language } = useLanguage()
  const { sectionId } = useParams()
  const data = documentationData[language]
  const isArabic = language === 'ar'

  const section = data.sections.find(s => s.id === sectionId)

  return (
    <nav className={styles.breadcrumbs} aria-label={isArabic ? 'مسار التنقل' : 'Breadcrumb'}>
      <Link to="/documentation" className={styles.link}>
        <i className="fa-solid fa-book"></i>
        <span>{isArabic ? 'التوثيق' : 'Documentation'}</span>
      </Link>

      {section && (
        <>
          <span className={styles.separator}>
            <i className={`fa-solid fa-chevron-${isArabic ? 'left' : 'right'}`}></i>
          </span>
          <span className={styles.current}>{section.title}</span>
        </>
      )}
    </nav>
  )
}
