import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Full-screen error detail modal rendered into document.body via portal.
 * Props:
 *   error   — string | null  — error text to display; null = hidden
 *   onClose — () => void
 */
export default function ErrorModal({ error, onClose }) {
  useEffect(() => {
    if (!error) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [error, onClose])

  if (!error) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99998,
        backdropFilter: 'blur(6px)',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #1e1e2e)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '580px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="d-flex justify-between align-center mb-3"
          style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}
        >
          <h3
            className="m-0"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#ef4444',
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" />
            تفاصيل الخطأ
          </h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              lineHeight: 1,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Error body */}
        <div
          style={{
            direction: 'ltr',
            textAlign: 'left',
            background: 'rgba(15,15,25,0.8)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.15)',
            fontFamily: 'monospace',
            fontSize: '.85rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '320px',
            overflowY: 'auto',
            color: '#fca5a5',
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>

        <div className="mt-4 d-flex justify-end">
          <button className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
