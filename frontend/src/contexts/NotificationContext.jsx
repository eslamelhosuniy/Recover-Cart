import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationContext = createContext(null)

const toastStyle = `
@keyframes slideInRight {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`

function Toast({ toast, onClose }) {
  const { id, message, type, duration = 4000 } = toast
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const step = 100 / (duration / 50)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - step
      })
    }, 50)
    return () => clearInterval(interval)
  }, [duration])

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  }

  const colors = {
    success: {
      text: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.35)',
      glow: 'rgba(16, 185, 129, 0.15)'
    },
    error: {
      text: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.35)',
      glow: 'rgba(239, 68, 68, 0.15)'
    },
    info: {
      text: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.08)',
      border: 'rgba(59, 130, 246, 0.35)',
      glow: 'rgba(59, 130, 246, 0.15)'
    },
    warning: {
      text: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.35)',
      glow: 'rgba(245, 158, 11, 0.15)'
    }
  }

  const config = colors[type] || colors.info

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, rgba(28, 28, 44, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%)',
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        boxShadow: `0 8px 30px rgba(0,0,0,0.35), 0 0 15px ${config.glow}`,
        overflow: 'hidden',
        position: 'relative',
        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        direction: 'rtl',
        width: '340px'
      }}
    >
      <div className="d-flex align-center p-3 gap-3">
        <div 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: config.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${config.border}`,
            flexShrink: 0
          }}
        >
          <i className={`fa-solid ${icons[type] || icons.info}`} style={{ color: config.text, fontSize: '1rem' }} />
        </div>
        
        <div style={{ flex: 1, fontSize: '.85rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.4 }}>
          {message}
        </div>

        <button 
          onClick={() => onClose(id)}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#8e8ea8',
            cursor: 'pointer',
            padding: '.25rem',
            fontSize: '1rem',
            transition: 'color 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.target.style.color = '#ffffff'}
          onMouseLeave={(e) => e.target.style.color = '#8e8ea8'}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {/* Progress Bar */}
      <div 
        style={{
          height: '3px',
          width: `${progress}%`,
          backgroundColor: config.text,
          boxShadow: `0 0 8px ${config.text}`,
          transition: 'width 50ms linear',
          alignSelf: 'flex-start'
        }}
      />
    </div>
  )
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeNotification = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type, duration }])
    setTimeout(() => removeNotification(id), duration)
  }, [removeNotification])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <style dangerouslySetInnerHTML={{ __html: toastStyle }} />
      {children}
      <div 
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
          maxWidth: '360px',
          width: '100%'
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeNotification} />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}
