import { useState } from 'react'
import RatingStars from './RatingStars'

/**
 * ReviewModal Component
 * Displays detailed review information in a modal overlay
 */
export default function ReviewModal({ review, onClose, onCustomerClick }) {
  const [isClosing, setIsClosing] = useState(false)

  if (!review) return null

  const closeModal = () => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(onClose, 220)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }

  const handleCustomerClick = () => {
    if (onCustomerClick && review.customer_id) {
      onCustomerClick(review.customer_id)
    }
    closeModal()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const modalBackdropClass = `review-modal-backdrop ${isClosing ? 'review-modal-closing' : 'animate-in'}`
  const modalCardClass = `review-modal-card ${isClosing ? 'review-modal-closing' : 'animate-in'}`

  return (
    <div className={modalBackdropClass} onClick={handleBackdropClick}>
      <div className={modalCardClass}>
        <div className="review-modal-header">
          <h2>تفاصيل التقييم</h2>
          <button type="button" className="review-modal-close" onClick={closeModal} aria-label="إغلاق">
            ×
          </button>
        </div>

        <div className="review-modal-body">
          <div className="review-modal-field">
            <label className="form-label">العميل</label>
            <div
              className="form-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: review.customer_id ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (review.customer_id && onCustomerClick) {
                  onCustomerClick(review.customer_id)
                  closeModal()
                }
              }}
              title={review.customer_id ? 'انقر لعرض تفاصيل العميل' : ''}
            >
              <span style={{ color: review.customer_id ? 'var(--accent)' : 'var(--text)', fontWeight: review.customer_id ? 700 : 400 }}>
                {review.customer_name || 'Unknown'}
              </span>
              {review.customer_id && (
                <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.85rem', color: 'var(--accent)', marginLeft: '0.5rem' }} />
              )}
            </div>
          </div>

          <div className="review-modal-field">
            <label className="form-label">التقييم</label>
            <div className="review-modal-rating-field">
              <RatingStars rating={review.rating} size="lg" />
            </div>
          </div>

          {review.review_content && (
            <div className="review-modal-field review-modal-span-full">
              <label className="form-label">النص</label>
              <textarea
                className="form-textarea"
                value={review.review_content}
                readOnly
              />
            </div>
          )}

          {review.order_id && (
            <div className="review-modal-field">
              <label className="form-label">معرّف الطلب</label>
              <input className="form-input" value={review.order_id} readOnly />
            </div>
          )}

          {review.order_reference_id && (
            <div className="review-modal-field">
              <label className="form-label">رقم الطلب المرجعي</label>
              <input className="form-input" value={review.order_reference_id} readOnly />
            </div>
          )}

          {review.product_id && (
            <div className="review-modal-field">
              <label className="form-label">معرّف المنتج</label>
              <input className="form-input" value={review.product_id} readOnly />
            </div>
          )}

          <div className="review-modal-field">
            <label className="form-label">التاريخ</label>
            <input className="form-input" value={formatDate(review.reviewed_at)} readOnly />
          </div>

          {review.review_type && (
            <div className="review-modal-field">
              <label className="form-label">نوع التقييم</label>
              <input className="form-input" value={review.review_type} readOnly />
            </div>
          )}
        </div>

        <div className="review-modal-footer">
          <button type="button" className="btn btn-secondary review-modal-action review-modal-back-button" onClick={closeModal}>
            رجوع
          </button>
          <button type="button" className="btn btn-secondary review-modal-action" onClick={closeModal}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
