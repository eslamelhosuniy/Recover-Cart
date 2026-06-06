import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import styles from './StepGuide.module.css'
import imageMapping from './imageMapping.json'

export default function StepGuide({ steps, sectionId }) {
  const { language } = useLanguage()
  const isArabic = language === 'ar'
  const [modalImage, setModalImage] = useState(null)

  const getImageUrl = (stepNumber) => {
    // Map step numbers to image filenames
    const filename = stepNumber === 1 ? 'image.webp' : `image (${stepNumber - 1}).webp`
    // Use mapped cloud URL if available, otherwise fall back to local relative path
    return imageMapping[sectionId]?.[filename] || `/documentation/${sectionId}/${filename}`
  }

  const openModal = (src, alt) => {
    setModalImage({ src, alt })
  }

  const closeModal = useCallback(() => {
    setModalImage(null)
  }, [])

  // Close modal on Escape key
  useEffect(() => {
    if (!modalImage) return
    const handleKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKey)
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [modalImage, closeModal])

  return (
    <>
      <div className={styles.stepsContainer}>
        {steps.map((step) => (
          <div key={step.number} className={styles.step} id={`step-${step.number}`}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepTitleSection}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                {step.note && <span className={styles.note}>{step.note}</span>}
              </div>
            </div>

            <div className={styles.stepContent}>
              <p className={styles.description}>{step.description}</p>

              {/* Clickable image */}
              <div className={styles.imageWrapper}>
                <img
                  src={getImageUrl(step.number)}
                  alt={`${isArabic ? 'الخطوة' : 'Step'} ${step.number}`}
                  className={styles.image}
                  onClick={(e) =>
                    openModal(
                      e.target.src,
                      `${isArabic ? 'الخطوة' : 'Step'} ${step.number} — ${step.title}`
                    )
                  }
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {modalImage && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <button
            className={styles.modalClose}
            onClick={closeModal}
            aria-label={isArabic ? 'إغلاق' : 'Close'}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className={styles.modalImage}
            />
            <p className={styles.modalCaption}>{modalImage.alt}</p>
          </div>
        </div>
      )}
    </>
  )
}
