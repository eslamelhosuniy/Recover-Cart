import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import DocLayout from '../components/documentation/DocLayout'
import StepGuide from '../components/documentation/StepGuide'
import { useLanguage } from '../contexts/LanguageContext'
import { documentationData } from '../data/documentationData'
import styles from './DocumentationSection.module.css'

export default function DocumentationSection() {
  const { sectionId } = useParams()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const data = documentationData[language]
  const isArabic = language === 'ar'

  const section = data.sections.find(s => s.id === sectionId)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [sectionId, language])

  if (!section) {
    return (
      <DocLayout>
        <div className={styles.error}>
          <i className="fa-solid fa-circle-exclamation"></i>
          <h2>{isArabic ? 'لم يتم العثور على القسم' : 'Section Not Found'}</h2>
          <p>{isArabic ? 'عذراً، القسم الذي تبحث عنه غير موجود.' : 'Sorry, the section you are looking for does not exist.'}</p>
          <Link to="/documentation" className={styles.backButton}>
            {isArabic ? 'العودة إلى التوثيق' : 'Back to Documentation'}
          </Link>
        </div>
      </DocLayout>
    )
  }

  const currentIndex = data.sections.findIndex(s => s.id === sectionId)
  const previousSection = currentIndex > 0 ? data.sections[currentIndex - 1] : null
  const nextSection = currentIndex < data.sections.length - 1 ? data.sections[currentIndex + 1] : null

  return (
    <DocLayout>
      <div className={styles.header}>
        <div className={styles.headerIcon} style={{ backgroundColor: section.color + '20' }}>
          <i className={`${section.icon === 'fa-whatsapp' ? 'fa-brands' : 'fa-solid'} ${section.icon}`} style={{ color: section.color }}></i>
        </div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{section.title}</h1>
          <p className={styles.description}>{section.description}</p>
        </div>
      </div>

      <div className={styles.infoCards}>
        {section.prerequisites && section.prerequisites.length > 0 && (
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div className={styles.infoContent}>
              <h4>{isArabic ? 'المتطلبات' : 'Prerequisites'}</h4>
              <ul>
                {section.prerequisites.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className={styles.infoContent}>
            <h4>{isArabic ? 'وقت الإعداد' : 'Setup Time'}</h4>
            <p>{isArabic ? 'حوالي 15-30 دقيقة' : 'Approximately 15-30 minutes'}</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <StepGuide steps={section.steps} sectionId={sectionId} />
      </div>

      {/* Troubleshooting Section */}
      {section.troubleshooting && section.troubleshooting.length > 0 && (
        <section className={styles.section}>
          <h2>{isArabic ? 'استكشاف الأخطاء' : 'Troubleshooting'}</h2>
          <div className={styles.troubleshootingList}>
            {section.troubleshooting.map((item, idx) => (
              <div key={idx} className={styles.troubleshootingItem}>
                <div className={styles.troubleshootingQuestion}>
                  <i className="fa-solid fa-circle-question"></i>
                  <strong>{item.issue}</strong>
                </div>
                <div className={styles.troubleshootingSolution}>
                  <i className="fa-solid fa-lightbulb"></i>
                  <span>{item.solution}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {section.faq && section.faq.length > 0 && (
        <section className={styles.section}>
          <h2>{isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h2>
          <div className={styles.faqList}>
            {section.faq.map((item, idx) => (
              <details key={idx} className={styles.faqItem}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Verification Section */}
      {section.verification && section.verification.length > 0 && (
        <section className={styles.section}>
          <h2>{isArabic ? 'قائمة التحقق النهائية' : 'Final Verification Checklist'}</h2>
          <div className={styles.verificationList}>
            {section.verification.map((item, idx) => (
              <label key={idx} className={styles.checklistItem}>
                <input type="checkbox" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Navigation */}
      <div className={styles.navigation}>
        {previousSection ? (
          <Link to={`/documentation/${previousSection.id}`} className={styles.navLink}>
            <i className={`fa-solid fa-arrow-${isArabic ? 'right' : 'left'}`}></i>
            <div className={styles.navText}>
              <span className={styles.navLabel}>
                {isArabic ? 'السابق' : 'Previous'}
              </span>
              <span className={styles.navTitle}>{previousSection.title}</span>
            </div>
          </Link>
        ) : (
          <div></div>
        )}

        {nextSection ? (
          <Link to={`/documentation/${nextSection.id}`} className={`${styles.navLink} ${styles.next}`}>
            <div className={styles.navText}>
              <span className={styles.navLabel}>
                {isArabic ? 'التالي' : 'Next'}
              </span>
              <span className={styles.navTitle}>{nextSection.title}</span>
            </div>
            <i className={`fa-solid fa-arrow-${isArabic ? 'left' : 'right'}`}></i>
          </Link>
        ) : (
          <div></div>
        )}
      </div>
    </DocLayout>
  )
}
