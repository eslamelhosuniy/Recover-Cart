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
                          <div className="text-danger text-small mt-1" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                            {msg.error_message}
                          </div>
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
    </div>
  )
}
