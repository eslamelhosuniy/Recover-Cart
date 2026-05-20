import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import usePagination from '../hooks/usePagination'
import { messagesApi, cartsApi } from '../api/client'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ErrorModal from '../components/ui/ErrorModal'
import UnifiedFilter from '../components/ui/UnifiedFilter'

const STATUS_MAP = {
  pending: { label: 'في الانتظار', icon: 'fa-clock', color: 'warning' },
  accepted: { label: 'مقبولة', icon: 'fa-check', color: 'info' },
  sent: { label: 'تم الإرسال', icon: 'fa-check-double', color: 'muted' },
  read: { label: 'مقروءة', icon: 'fa-check-double', color: 'info' },
  failed: { label: 'فشلت', icon: 'fa-xmark', color: 'danger' },
}

export default function Messages() {
  const navigate = useNavigate()
  const { page, limit, skip, handlePageChange, resetPage } = usePagination(10)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await messagesApi.list(skip, limit, startDate, endDate)
      const messagesData = res.data.data

      // Fetch cart details for these messages
      const cartIds = [...new Set(messagesData.map(m => m.cart_id))]
      const cartPromises = cartIds.map(id => cartsApi.get(id).catch(() => null))
      const cartsResponses = await Promise.all(cartPromises)

      const cartsMap = {}
      cartsResponses.forEach(cRes => {
        if (cRes && cRes.data) {
          cartsMap[cRes.data.id] = cRes.data
        }
      })

      const enrichedMessages = messagesData.map(msg => ({
        ...msg,
        cart: cartsMap[msg.cart_id] || null
      }))

      setData(enrichedMessages)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [skip, limit, startDate, endDate])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    resetPage()
  }, [startDate, endDate, resetPage])

  if (loading && data.length === 0) return <Spinner center />

  return (
    <>
      <ErrorModal error={selectedError} onClose={() => setSelectedError(null)} />

      <div className="card animate-in">
        <div className="card-header d-flex justify-between align-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title">سجل الرسائل</h2>
            <div className="text-muted text-small">إجمالي: {total}</div>
          </div>
          <UnifiedFilter
            startDate={startDate}
            endDate={endDate}
            onApply={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
        </div>

        {data.length === 0 ? (
          <EmptyState title="لا توجد رسائل" desc="لم يتم إرسال أي رسائل حتى الآن." icon="fa-comment-slash" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>رقم الواتساب</th>
                    <th>رقم السلة المرتبطة</th>
                    <th>العميل</th>
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
                        <td dir="ltr" className="text-right fw-bold text-muted">
                          {msg.cart?.customer ? msg.cart.customer.mobile : '-'}
                        </td>
                        <td className="fw-bold">
                          {msg.cart ? (
                            msg.cart.checkout_url ? (
                              <a
                                href={msg.cart.checkout_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}
                                title="الذهاب لصفحة إتمام الشراء"
                              >
                                #{msg.cart.salla_cart_id.substring(0, 8)}
                                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '.75rem' }} />
                              </a>
                            ) : (
                              <span className="text-muted">#{msg.cart.salla_cart_id.substring(0, 8)}</span>
                            )
                          ) : (
                            <span className="text-muted">#{msg.cart_id.substring(0, 8)}</span>
                          )}
                        </td>
                        <td>
                          {msg.cart?.customer ? (
                            <button
                              onClick={() => navigate('/customers', { state: { selectedCustomer: msg.cart.customer } })}
                              className="btn btn-link p-0 text-start"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}
                              title="عرض سلات هذا العميل"
                            >
                              {msg.cart.customer.full_name || 'غير معروف'}
                            </button>
                          ) : (
                            <span className="text-muted">غير معروف</span>
                          )}
                        </td>
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
      </div>
    </>
  )
}
