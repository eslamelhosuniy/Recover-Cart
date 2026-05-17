import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { dashboardApi, cartsApi } from '../api/client'

export default function Dashboard() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState(null)
  const [recentCarts, setRecentCarts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nextRun, setNextRun] = useState(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [timerParts, setTimerParts] = useState({ hours: '00', minutes: '00', seconds: '00' })

  const fetchNextJob = useCallback(() => {
    dashboardApi.nextJob()
      .then(res => {
        if (res.data?.next_run_time) {
          setNextRun(new Date(res.data.next_run_time))
        }
      })
      .catch(err => console.error(err))
  }, [])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [kpiRes, cartsRes] = await Promise.all([
        dashboardApi.kpis(),
        cartsApi.list(0, 5),
      ])
      setKpis(kpiRes.data)
      setRecentCarts(cartsRes.data.data)
      fetchNextJob()
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [fetchNextJob])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchNextJob, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData, fetchNextJob])

  useEffect(() => {
    if (!nextRun) return

    const updateTimer = () => {
      const diff = nextRun.getTime() - new Date().getTime()
      if (diff <= 0) {
        setTimeLeft('قيد التشغيل...')
        setTimerParts({ hours: '00', minutes: '00', seconds: '00' })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      const hoursStr = String(hours).padStart(2, '0')
      const minutesStr = String(minutes).padStart(2, '0')
      const secondsStr = String(seconds).padStart(2, '0')

      setTimeLeft('active')
      setTimerParts({ hours: hoursStr, minutes: minutesStr, seconds: secondsStr })
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(timerInterval)
  }, [nextRun])

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

      {/* Automated Job Timer Banner */}
      {nextRun && (
        <div 
          className="mb-3 d-flex justify-between align-center p-2 px-3 fade-in"
          style={{
            background: 'linear-gradient(135deg, var(--bg-card, #1e1e2e) 0%, rgba(20, 20, 35, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="d-flex align-center gap-2">
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <i className="fa-solid fa-bolt fa-bounce text-accent" style={{ fontSize: '1rem' }} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '.85rem', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                مساعد استرجاع السلات الذكي
                <span 
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="d-flex align-center gap-2">
            <span style={{ fontSize: '.75rem', fontWeight: '700', color: '#a0a0b8' }}>التشغيل القادم:</span>
            <div 
              style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                fontWeight: '800',
                color: timeLeft === 'قيد التشغيل...' ? '#10b981' : 'var(--accent)',
                backgroundColor: 'rgba(15, 15, 25, 0.6)',
                padding: '.25rem .6rem',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                direction: 'ltr',
                minWidth: '80px',
                textAlign: 'center'
              }}
            >
              {timeLeft === 'active' ? `${timerParts.hours}:${timerParts.minutes}:${timerParts.seconds}` : timeLeft}
            </div>
          </div>
        </div>
      )}

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
                    <td className="fw-bold">
                      {cart.checkout_url ? (
                        <a 
                          href={cart.checkout_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="الذهاب لصفحة إتمام الشراء"
                        >
                          #{cart.salla_cart_id.substring(0, 8)}
                          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '.7rem' }} />
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
