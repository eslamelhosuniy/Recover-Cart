import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import usePagination from '../hooks/usePagination'
import { cartsApi } from '../api/client'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import UnifiedFilter from '../components/ui/UnifiedFilter'

export default function RecoveredCarts() {
  const navigate = useNavigate()
  const { page, limit, skip, handlePageChange, resetPage } = usePagination(10)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchCarts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await cartsApi.list(skip, limit, 'recovered', startDate, endDate)
      setData(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [skip, limit, startDate, endDate])

  useEffect(() => {
    fetchCarts()
  }, [fetchCarts])

  // Reset pagination when filters change
  useEffect(() => {
    resetPage()
  }, [startDate, endDate, resetPage])

  const pageStats = data.reduce(
    (acc, cart) => {
      const paid = cart.recovered_details ? Number(cart.recovered_details.total) : Number(cart.cart_value)
      const discount = cart.recovered_details ? Number(cart.recovered_details.total_discount) : 0
      acc.paidTotal += paid
      acc.discountTotal += discount
      return acc
    },
    { paidTotal: 0, discountTotal: 0 }
  )

  if (loading && data.length === 0) {
    return <Spinner center />
  }

  return (
    <div className="animate-in fade-in">
      <div className="d-flex justify-between align-center mb-3">
        <h2 className="mb-0" style={{ fontSize: '1.25rem', fontWeight: 700 }}>سلات مهجورة تم شرائها</h2>
        <div className="d-flex align-center gap-2">
          <UnifiedFilter
            startDate={startDate}
            endDate={endDate}
            onApply={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
          <button className="btn btn-secondary btn-sm" onClick={fetchCarts} title="تحديث القائمة" style={{ height: '36px' }}>
            <i className="fa-solid fa-rotate-right" />
          </button>
        </div>
      </div>

      <div className="card">
        {data.length === 0 ? (
          <EmptyState
            title="لا توجد سلات مسترجعة"
            desc="لم يتم استرجاع أو شراء أي سلات مهجورة بعد."
            icon="fa-cart-arrow-down"
          />
        ) : (
          <>
            <div className="table-wrap" style={{ marginBottom: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>رقم السلة</th>
                    <th>العميل</th>
                    <th>رقم الواتساب</th>
                    <th>القيمة الأصلية</th>
                    <th>القيمة المدفوعة</th>
                    <th>الخصم</th>
                    <th>وقت الشراء</th>
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
                      <td dir="ltr" className="text-right fw-bold text-muted">
                        {cart.customer ? cart.customer.mobile : '-'}
                      </td>
                      <td className="text-muted text-decoration-line-through">
                        {cart.cart_value} ر.س
                      </td>
                      <td className="fw-bold text-success">
                        {cart.recovered_details ? `${cart.recovered_details.total} ${cart.recovered_details.currency}` : `${cart.cart_value} ر.س`}
                      </td>
                      <td className="text-danger fw-bold">
                        {cart.recovered_details && cart.recovered_details.total_discount > 0 ? `-${cart.recovered_details.total_discount} ${cart.recovered_details.currency}` : '-'}
                      </td>
                      <td>
                        {cart.recovered_at ? new Date(cart.recovered_at).toLocaleString('ar-SA') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Simple Stats Summary Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-card)',
                flexWrap: 'wrap'
              }}
            >
              <span className="fw-bold text-primary" style={{ fontSize: '0.95rem' }}>{total} المجموع</span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>إجمالي المدفوع: {pageStats.paidTotal.toFixed(2)} ر.س</span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>إجمالي الخصومات المطبقة: {pageStats.discountTotal.toFixed(2)} ر.س</span>
            </div>

          </>
        )}

        {total > limit && (
          <div className="card-footer">
            <Pagination page={page} total={total} limit={limit} onChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  )
}
