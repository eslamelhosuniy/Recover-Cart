import { useState, useEffect, useCallback } from 'react'
import usePagination from '../hooks/usePagination'
import { customersApi } from '../api/client'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

export default function Customers() {
  const { page, limit, skip, handlePageChange } = usePagination(10)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

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
                    <td className="fw-bold">{cust.full_name || 'غير معروف'}</td>
                    <td dir="ltr" className="text-right">
                      {cust.mobile_code} {cust.mobile}
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
