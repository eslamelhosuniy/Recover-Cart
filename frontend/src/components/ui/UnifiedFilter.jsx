import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function UnifiedFilter({ startDate, endDate, onApply }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)

  // Sync temp state when props change
  useEffect(() => {
    setTempStart(startDate || '')
    setTempEnd(endDate || '')
  }, [startDate, endDate])

  const handleOpen = () => {
    setTempStart(startDate || '')
    setTempEnd(endDate || '')
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleApply = () => {
    onApply(tempStart, tempEnd)
    setIsOpen(false)
  }

  const handleReset = () => {
    onApply('', '')
    setIsOpen(false)
  }

  const hasFilter = startDate || endDate

  // Format date range nicely
  const getButtonText = () => {
    if (startDate && endDate) {
      return `${startDate} ↔ ${endDate}`
    } else if (startDate) {
      return `منذ ${startDate}`
    } else if (endDate) {
      return `حتى ${endDate}`
    }
    return 'تصفية حسب التاريخ'
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
      <button
        type="button"
        onClick={handleOpen}
        className={`btn ${hasFilter ? 'btn-primary' : 'btn-secondary'} btn-sm d-flex align-center gap-1`}
        style={{
          height: '36px',
          padding: '0 0.85rem',
          borderRadius: '6px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <i className="fa-solid fa-calendar-days" style={{ fontSize: '0.9rem' }} />
        <span>{getButtonText()}</span>
      </button>

      {hasFilter && (
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-secondary btn-sm d-flex align-center justify-center"
          style={{
            height: '36px',
            width: '36px',
            padding: 0,
            borderRadius: '6px',
            borderColor: 'var(--border)',
            color: 'var(--danger)',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="إعادة تعيين التصفية"
        >
          <i className="fa-solid fa-trash-can" style={{ fontSize: '0.9rem' }} />
        </button>
      )}

      {isOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)',
            padding: '1rem',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #1e1e2e)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="d-flex justify-between align-center mb-3"
              style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}
            >
              <h3 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                تصفية بالتواريخ
              </h3>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '1.1rem',
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Inputs */}
            <div className="d-flex flex-column gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>من تاريخ</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ height: '38px', borderRadius: '6px', width: '100%' }}
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>إلى تاريخ</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ height: '38px', borderRadius: '6px', width: '100%' }}
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex gap-2 justify-end" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '6px' }}
                onClick={handleClose}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ borderRadius: '6px' }}
                onClick={handleApply}
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
