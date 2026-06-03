import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import DocLayout from '../components/documentation/DocLayout'
import DocCard from '../components/documentation/DocCard'
import { useLanguage } from '../contexts/LanguageContext'
import { documentationData } from '../data/documentationData'
import styles from './DocumentationHome.module.css'

export default function DocumentationHome() {
  const { language } = useLanguage()
  const data = documentationData[language]
  const isArabic = language === 'ar'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [language])

  return (
    <DocLayout>
      <div className={styles.heroHeader}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{data.title}</h1>
          <p className={styles.description}>{data.description}</p>
        </div>
        <Link
          to="/dashboard"
          className={styles.backButton}
        >
          <i className={`fa-solid fa-arrow-${isArabic ? 'right' : 'left'}`} />
          {isArabic ? 'العودة للرئيسية' : 'Back to Dashboard'}
        </Link>
      </div>

      <div className={styles.grid}>
        {data.sections.map(section => (
          <DocCard key={section.id} section={section} />
        ))}
      </div>

      <div className={styles.cta}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaIcon}>
            <i className="fa-solid fa-headset"></i>
          </div>
          <div className={styles.ctaContent}>
            <h3>{isArabic ? 'هل تحتاج إلى مساعدة؟' : 'Need Help?'}</h3>
            <p>{isArabic ? 'فريقنا متاح دائماً للمساعدة والإجابة على أسئلتك' : 'Our team is available to help answer your questions'}</p>
          </div>
          <a
            href="https://wa.me/201222203198"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButton}
          >
            {isArabic ? 'تواصل معنا' : 'Contact Us'}
            <i className={`fa-solid fa-arrow-${isArabic ? 'left' : 'right'}`}></i>
          </a>
        </div>
      </div>
    </DocLayout>
  )
}
