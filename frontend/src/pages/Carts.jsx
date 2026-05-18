import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import usePagination from '../hooks/usePagination'
import { cartsApi } from '../api/client'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import ErrorModal from '../components/ui/ErrorModal'

export default function Carts() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { page, limit, skip, handlePageChange } = usePagination(10)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [errorDetail, setErrorDetail] = useState(null)

  const fetchCarts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await cartsApi.list(skip, limit)
      setData(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [skip, limit])

  useEffect(() => {
    fetchCarts()
  }, [fetchCarts])

  const handleRemind = async (id) => {
    if (!window.confirm('هل أنت متأكد من إرسال تذكير يدوي لهذه السلة؟')) return
    setActionLoading(id)
    try {
      await cartsApi.remind(id)
      showNotification('تم إرسال تذكير واتساب اليدوي بنجاح!', 'success')
      await fetchCarts()
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'حدث خطأ أثناء إرسال تذكير واتساب.'
      setErrorDetail(errMsg)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && data.length === 0) return <Spinner center />

  return (
    <>
      <ErrorModal error={errorDetail} onClose={() => setErrorDetail(null)} />

      <div className="card animate-in">
        <div className="card-header">
          <h2 className="card-title">إدارة السلات المهجورة</h2>
          <div className="text-muted text-small">إجمالي: {total}</div>
        </div>

        {data.length === 0 ? (
          <EmptyState title="لا توجد سلات" desc="لم يتم العثور على سلات مطابقة." icon="fa-shopping-cart" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>رقم السلة</th>
                    <th>العميل</th>
                    <th>رقم الجوال</th>
                    <th>القيمة</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((cart) => (
                    <tr key={cart.id}>
                      <td className="fw-bold">
                        {cart.checkout_url ? (
                          <a 
                            href={cart.checkout_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}
                            title="الذهاب لصفحة إتمام الشراء"
                          >
                            #{cart.salla_cart_id.substring(0, 8)}
                            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '.75rem' }} />
                          </a>
                        ) : (
                          <span className="text-muted">#{cart.salla_cart_id.substring(0, 8)}</span>
                        )}
                      </td>
                      <td>
                        {cart.customer ? (
                          <button
                            onClick={() => navigate('/customers', { state: { selectedCustomer: cart.customer } })}
                            className="btn btn-link p-0 text-start"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}
                            title="عرض سلات هذا العميل"
                          >
                            {cart.customer.full_name || 'غير معروف'}
                          </button>
                        ) : (
                          <span className="text-muted">غير معروف</span>
                        )}
                      </td>
                      <td dir="ltr" className="text-right">
                        {cart.customer ? `${cart.customer.mobile}` : '-'}
                      </td>
                      <td className="fw-bold text-gold">{cart.cart_value} {cart.currency || 'ر.س'}</td>
                      <td dir="ltr" className="text-right">{new Date(cart.abandoned_at).toLocaleString('ar-SA')}</td>
                      <td>
                        <div className="d-flex align-center gap-2">
                          {cart.is_recovered ? (
                            <Badge variant="success">مسترجعة</Badge>
                          ) : (
                            <Badge variant="muted">مهجورة</Badge>
                          )}
                          {cart.reminder_sent ? (
                            <span className="text-small text-success">تذكير مُرسل</span>
                          ) : (
                            <span className="text-small text-warning">تذكير معلق</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={cart.is_recovered || cart.reminder_sent || actionLoading === cart.id}
                          onClick={() => handleRemind(cart.id)}
                          title="إرسال تذكير الآن"
                        >
                          {actionLoading === cart.id ? (
                            <i className="fa-solid fa-spinner fa-spin" />
                          ) : (
                            <i className="fa-brands fa-whatsapp text-success" />
                          )}
                          <span className="hide-mobile" style={{ marginRight: '.3rem' }}>تذكير</span>
                        </button>
                      </td>
                    </tr>
                  ))}
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
