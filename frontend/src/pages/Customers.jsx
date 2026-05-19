import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import usePagination from '../hooks/usePagination'
import { customersApi } from '../api/client'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

export default function Customers() {
  const location = useLocation()
  const { page, limit, skip, handlePageChange } = usePagination(10)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerCarts, setCustomerCarts] = useState([])
  const [cartsLoading, setCartsLoading] = useState(false)

  useEffect(() => {
    if (location.state?.selectedCustomer) {
      setSelectedCustomer(location.state.selectedCustomer)
    }
  }, [location.state])

  useEffect(() => {
    if (selectedCustomer) {
      setCartsLoading(true)
      customersApi.getCarts(selectedCustomer.id)
        .then((res) => {
          setCustomerCarts(res.data)
        })
        .catch((err) => {
          console.error(err)
        })
        .finally(() => {
          setCartsLoading(false)
        })
    } else {
      setCustomerCarts([])
    }
  }, [selectedCustomer])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await customersApi.list(skip, limit)
      setData(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [skip, limit])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  if (loading && data.length === 0) return <Spinner center />

  if (selectedCustomer) {
    return (
      <div className="card animate-in">
        <div className="card-header d-flex justify-between align-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="btn btn-secondary text-small d-flex align-center gap-1 mb-2"
              style={{ padding: '.4rem .8rem', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}
            >
              <i className="fa-solid fa-arrow-right" />
              العودة لقائمة العملاء
            </button>
            <h2 className="card-title m-0" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '1.4rem', fontWeight: 700 }}>
              <i className="fa-solid fa-user text-accent" />
              سلات العميل: {selectedCustomer.full_name}
            </h2>
          </div>

          <div style={{ textAlign: 'left', direction: 'ltr' }}>
            <div className="text-muted text-small">الجوال: {selectedCustomer.mobile}</div>
            <div className="text-muted text-small">البريد: {selectedCustomer.email || '-'}</div>
          </div>
        </div>

        {cartsLoading ? (
          <Spinner center />
        ) : customerCarts.length === 0 ? (
          <EmptyState title="لا توجد سلات متروكة" desc="هذا العميل لا يمتلك أي سلات متروكة في الوقت الحالي." icon="fa-shopping-basket" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>رقم السلة</th>
                    <th>القيمة</th>
                    <th>تاريخ ترك السلة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {customerCarts.map((cart) => (
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
                      <td className="fw-bold text-gold">{cart.cart_value} ر.س</td>
                      <td dir="ltr" className="text-right">
                        {new Date(cart.abandoned_at).toLocaleString('ar-SA')}
                      </td>
                      <td>
                        {cart.is_recovered ? (
                          <span className="badge badge-success">تم شرائها</span>
                        ) : cart.reminder_sent ? (
                          <span className="badge badge-warning">تم التذكير</span>
                        ) : (
                          <span className="badge badge-secondary">قيد الانتظار</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="card animate-in">
      <div className="card-header">
        <h2 className="card-title">قائمة العملاء</h2>
        <div className="text-muted text-small">إجمالي: {total}</div>
      </div>

      {data.length === 0 ? (
        <EmptyState title="لا يوجد عملاء" desc="لم يتم تسجيل أي عملاء بعد." icon="fa-users-slash" />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم الجوال</th>
                  <th>البريد الإلكتروني</th>
                  <th>عدد السلات</th>
                  <th>تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody>
                {data.map((cust) => (
                  <tr key={cust.id}>
                    <td className="fw-bold">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="btn btn-link p-0 text-start"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}
                      >
                        {cust.full_name || 'غير معروف'}
                      </button>
                    </td>
                    <td dir="ltr" className="text-right">
                      {cust.mobile}
                    </td>
                    <td className="text-muted">{cust.email || '-'}</td>
                    <td>
                      <span className="badge badge-info">{cust.total_carts}</span>
                    </td>
                    <td>{new Date(cust.created_at).toLocaleDateString('ar-SA')}</td>
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
  )
}
