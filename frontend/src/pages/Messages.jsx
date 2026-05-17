import { useState, useEffect, useCallback } from 'react'
import usePagination from '../hooks/usePagination'
import { messagesApi } from '../api/client'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

const STATUS_MAP = {
  pending:   { label: 'في الانتظار', icon: 'fa-clock', color: 'warning' },
  accepted:  { label: 'مقبولة', icon: 'fa-check', color: 'info' },
  sent:      { label: 'تم الإرسال', icon: 'fa-check-double', color: 'muted' },
  read:      { label: 'مقروءة', icon: 'fa-check-double', color: 'info' },
  failed:    { label: 'فشلت', icon: 'fa-xmark', color: 'danger' },
}

export default function Messages() {
  const { page, limit, skip, handlePageChange } = usePagination(10)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await messagesApi.list(skip, limit)
      setData(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [skip, limit])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  if (loading && data.length === 0) return <Spinner center />

  return (
    <div className="card animate-in">
      <div className="card-header">
        <h2 className="card-title">سجل الرسائل</h2>
        <div className="text-muted text-small">إجمالي: {total}</div>
      </div>

      {data.length === 0 ? (
        <EmptyState title="لا توجد رسائل" desc="لم يتم إرسال أي رسائل حتى الآن." icon="fa-comment-slash" />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الرسالة</th>
                  <th>رقم السلة المرتبطة</th>
                  <th>حالة واتساب</th>
                  <th>وقت الإرسال</th>
                  <th>وقت التحديث</th>
                </tr>
              </thead>
              <tbody>
                {data.map((msg) => {
                  const s = STATUS_MAP[msg.status] || STATUS_MAP.pending
                  return (
                    <tr key={msg.id}>
                      <td className="fw-bold text-muted">
                        {msg.whatsapp_msg_id ? msg.whatsapp_msg_id.substring(0, 15) + '...' : '-'}
                      </td>
                      <td className="text-muted">#{msg.cart_id.substring(0, 8)}</td>
                      <td>
                        <div className={`wa-status ${msg.status}`}>
                          <i className={`fa-solid ${s.icon} ticks`} />
                          <span>{s.label}</span>
                        </div>
                        {msg.status === 'failed' && msg.error_message && (
                          <button 
                            className="btn btn-link text-danger text-small p-0 mt-1 d-flex align-center gap-1"
                            onClick={() => setSelectedError(msg.error_message)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                          >
                            <i className="fa-solid fa-circle-info" />
                            عرض سبب الفشل
                          </button>
                        )}
                      </td>
                      <td dir="ltr" className="text-right">{new Date(msg.sent_at).toLocaleString('ar-SA')}</td>
                      <td dir="ltr" className="text-right">{new Date(msg.updated_at).toLocaleString('ar-SA')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {selectedError && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setSelectedError(null)}
        >
          <div 
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '550px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-between align-center mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 className="text-danger m-0" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '1.2rem', fontWeight: 700 }}>
                <i className="fa-solid fa-triangle-exclamation" />
                تفاصيل خطأ الإرسال
              </h3>
              <button 
                onClick={() => setSelectedError(null)} 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <i className="fa-solid fa-xmark fa-lg" />
              </button>
            </div>
            <div 
              style={{ 
                direction: 'ltr', 
                textAlign: 'left', 
                background: 'var(--bg-body, #f8f9fa)', 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)', 
                fontFamily: 'monospace', 
                fontSize: '.9rem',
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                maxHeight: '300px',
                overflowY: 'auto',
                color: 'var(--text-color, #333)'
              }}
            >
              {selectedError}
            </div>
            <div className="mt-4 d-flex justify-end">
              <button className="btn btn-secondary" onClick={() => setSelectedError(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
