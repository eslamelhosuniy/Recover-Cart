import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { dashboardApi, cartsApi } from '../api/client'

export default function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [recentCarts, setRecentCarts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [kpiRes, cartsRes] = await Promise.all([
        dashboardApi.kpis(),
        cartsApi.list(0, 5),
      ])
      setKpis(kpiRes.data)
      setRecentCarts(cartsRes.data.data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading && !kpis) {
    return <Spinner center />
  }

  return (
    <div className="animate-in">
      {/* Top Action */}
      <div className="d-flex justify-between align-center mb-3">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>نظرة عامة على الأداء</h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <i className={`fa-solid fa-rotate-right ${refreshing ? 'fa-spin' : ''}`} />
          تحديث البيانات
        </button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="kpi-grid">
          <KPICard
            label="إجمالي السلات"
            value={kpis.total_carts}
            icon="fa-cart-shopping"
            iconColor="#8b5cf6"
            sub="آخر 30 يوم"
          />
          <KPICard
            label="السلات المسترجعة"
            value={kpis.recovered_carts}
            icon="fa-circle-check"
            iconColor="#10b981"
            sub="تم الشراء بنجاح"
          />
          <KPICard
            label="نسبة الاسترجاع"
            value={`${kpis.recovery_rate}%`}
            icon="fa-chart-pie"
            iconColor="#3b82f6"
            sub="من إجمالي السلات"
          />
          <KPICard
            label="الأرباح المسترجعة"
            value={`${kpis.total_revenue_recovered} ر.س`}
            icon="fa-sack-dollar"
            iconColor="#f59e0b"
            sub="إيرادات مباشرة"
            highlight
          />
        </div>
      )}

      {/* Recent Carts */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">أحدث السلات المهجورة</h2>
          <Link to="/carts" className="btn btn-secondary btn-sm">
            عرض الكل
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '.5rem' }} />
          </Link>
        </div>

        {recentCarts.length === 0 ? (
          <EmptyState title="لا توجد سلات" desc="لم يتم العثور على سلات مهجورة حديثاً." icon="fa-cart-shopping" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم السلة</th>
                  <th>العميل</th>
                  <th>القيمة</th>
                  <th>التاريخ</th>
                  <th>حالة التذكير</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentCarts.map((cart) => (
                  <tr key={cart.id}>
                    <td className="fw-bold text-muted">
                      #{cart.salla_cart_id.substring(0, 8)}
                    </td>
                    <td>{cart.customer?.full_name || 'غير معروف'}</td>
                    <td className="fw-bold">{cart.cart_value} ر.س</td>
                    <td>{new Date(cart.abandoned_at).toLocaleDateString('ar-SA')}</td>
                    <td>
                      {cart.reminder_sent ? (
                        <Badge variant="success">تم الإرسال</Badge>
                      ) : (
                        <Badge variant="warning">في الانتظار</Badge>
                      )}
                    </td>
                    <td>
                      {cart.is_recovered ? (
                        <Badge variant="success">مسترجعة</Badge>
                      ) : (
                        <Badge variant="muted">مهجورة</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
