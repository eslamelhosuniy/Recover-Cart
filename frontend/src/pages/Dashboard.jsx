import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import UnifiedFilter from '../components/ui/UnifiedFilter'
import { dashboardApi, cartsApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { activeStore, loading: authLoading } = useAuth()
  const [kpis, setKpis] = useState(null)
  const [recentCarts, setRecentCarts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nextRun, setNextRun] = useState(null)
  const [nextReviewRun, setNextReviewRun] = useState(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [reviewTimeLeft, setReviewTimeLeft] = useState('')
  const [timerParts, setTimerParts] = useState({ hours: '00', minutes: '00', seconds: '00' })
  const [reviewTimerParts, setReviewTimerParts] = useState({ hours: '00', minutes: '00', seconds: '00' })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchNextJob = useCallback(() => {
    dashboardApi.nextJob()
      .then(res => {
        if (res.data?.next_run_time) {
          setNextRun(new Date(res.data.next_run_time))
        }
        if (res.data?.next_review_run_time) {
          setNextReviewRun(new Date(res.data.next_review_run_time))
        }
      })
      .catch(err => console.error(err))
  }, [])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [kpiRes, cartsRes] = await Promise.all([
        dashboardApi.kpis(startDate, endDate),
        cartsApi.list(0, 5, '', startDate, endDate),
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
  }, [fetchNextJob, startDate, endDate, activeStore])

  // Only fetch data after auth is loaded and activeStore is set
  useEffect(() => {
    if (authLoading || !activeStore) return
    
    fetchData()
    const interval = setInterval(fetchNextJob, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData, fetchNextJob, activeStore, authLoading])

  useEffect(() => {
    if (!nextRun && !nextReviewRun) return

    const updateTimer = () => {
      // Update reminder timer
      if (nextRun) {
        const diff = nextRun.getTime() - new Date().getTime()
        if (diff <= 0) {
          setTimeLeft('قيد التشغيل...')
          setTimerParts({ hours: '00', minutes: '00', seconds: '00' })
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)

          const hoursStr = String(hours).padStart(2, '0')
          const minutesStr = String(minutes).padStart(2, '0')
          const secondsStr = String(seconds).padStart(2, '0')

          setTimeLeft('active')
          setTimerParts({ hours: hoursStr, minutes: minutesStr, seconds: secondsStr })
        }
      }

      // Update review timer
      if (nextReviewRun) {
        const diff = nextReviewRun.getTime() - new Date().getTime()
        if (diff <= 0) {
          setReviewTimeLeft('قيد التشغيل...')
          setReviewTimerParts({ hours: '00', minutes: '00', seconds: '00' })
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)

          const hoursStr = String(hours).padStart(2, '0')
          const minutesStr = String(minutes).padStart(2, '0')
          const secondsStr = String(seconds).padStart(2, '0')

          setReviewTimeLeft('active')
          setReviewTimerParts({ hours: hoursStr, minutes: minutesStr, seconds: secondsStr })
        }
      }
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(timerInterval)
  }, [nextRun, nextReviewRun])

  if ((loading && !kpis) || (authLoading && !activeStore)) {
    return <Spinner center />
  }

  return (
    <div className="animate-in">
      {/* Top Action */}
      <div className="d-flex justify-between align-center mb-3">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }} className="mb-0">نظرة عامة على الأداء</h2>
        <div className="d-flex align-center gap-2">
          <UnifiedFilter
            startDate={startDate}
            endDate={endDate}
            onApply={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{ height: '36px' }}
          >
            <i className={`fa-solid fa-rotate-right ${refreshing ? 'fa-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Automated Jobs Status Banner */}
      {(nextRun || nextReviewRun) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem'
          }}
        >
          {/* Reminder Job Banner */}
          {nextRun && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(88, 28, 135, 0.06) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '10px',
                padding: '0.9rem',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <div className="d-flex align-center gap-2" style={{ minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    flexShrink: 0
                  }}
                >
                  <i className="fa-solid fa-bolt fa-bounce text-accent" style={{ fontSize: '0.95rem' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    السلة الفارغة
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 6px #10b981',
                        display: 'inline-block',
                        animation: 'pulse 1.5s infinite',
                        flexShrink: 0
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a0a0b8' }}>يُرسل تذكيرات السلة الفارغة</div>
                </div>
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  color: timeLeft === 'قيد التشغيل...' ? '#10b981' : '#8b5cf6',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  direction: 'ltr',
                  minWidth: '80px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {timeLeft === 'active' ? `${timerParts.hours}:${timerParts.minutes}:${timerParts.seconds}` : timeLeft}
              </div>
            </div>
          )}

          {/* Review Request Job Banner */}
          {nextReviewRun && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.06) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '10px',
                padding: '0.9rem',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <div className="d-flex align-center gap-2" style={{ minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    flexShrink: 0
                  }}
                >
                  <i className="fa-solid fa-star fa-bounce" style={{ fontSize: '0.95rem', color: '#3b82f6' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    طلبات التقييم
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        boxShadow: '0 0 6px #3b82f6',
                        display: 'inline-block',
                        animation: 'pulse 1.5s infinite',
                        flexShrink: 0
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a0a0b8' }}>يُرسل طلبات التقييم تلقائياً للعملاء</div>
                </div>
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  color: reviewTimeLeft === 'قيد التشغيل...' ? '#10b981' : '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  direction: 'ltr',
                  minWidth: '80px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {reviewTimeLeft === 'active' ? `${reviewTimerParts.hours}:${reviewTimerParts.minutes}:${reviewTimerParts.seconds}` : reviewTimeLeft}
              </div>
            </div>
          )}
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
            sub="فترة التصفية"
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
            label="السلات المتبقية"
            value={kpis.left_carts}
            icon="fa-cart-arrow-down"
            iconColor="#ef4444"
            sub="لم يتم شرائها بعد"
          />
          {/* Shipment related KPIs are removed after deprecating the old shipment review workflow. */}
          <KPICard
            label="عملاء استلموا تذكير"
            value={kpis.received_messages_customers}
            icon="fa-user-check"
            iconColor="#06b6d4"
            sub="استلموا رسالة واتساب"
          />
          <KPICard
            label="عملاء لم يستلموا تذكير"
            value={kpis.not_received_messages_customers}
            icon="fa-user-xmark"
            iconColor="#f43f5e"
            sub="لم يتم إرسال/توصيل لهم"
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
                        <Badge variant="success">تم شرائها</Badge>
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
