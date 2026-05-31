import { useState, useEffect, useCallback } from 'react'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import UnifiedFilter from '../components/ui/UnifiedFilter'
import { shipmentsApi } from '../api/client'

export default function ShipmentReviews() {
  const [stats, setStats] = useState(null)
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [statsRes, shipmentsRes] = await Promise.all([
        shipmentsApi.stats(startDate, endDate),
        shipmentsApi.list(0, 15, startDate, endDate),
      ])
      setStats(statsRes.data)
      setShipments(shipmentsRes.data.data)
    } catch (err) {
      console.error('Error fetching shipment review data:', err)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <Spinner center />
  }

  return (
    <div className="animate-in">
      <div className="d-flex justify-between align-center mb-3">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 0 }}>إشعارات التقييم للعملاء</h2>
          <p className="text-muted" style={{ marginTop: '.5rem' }}>عرض الشحنات، طلبات مراجعة العملاء، وحالة رسائل المراجعة.</p>
        </div>
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

      {stats && (
        <div className="kpi-grid">
          <KPICard
            label="إجمالي الشحنات"
            value={stats.total_shipments}
            icon="fa-box-open"
            iconColor="#8b5cf6"
            sub="الطلبات المستلمة من سلة سلة"
          />
          <KPICard
            label="شحنات مسلمة"
            value={stats.delivered_shipments}
            icon="fa-truck-fast"
            iconColor="#38bdf8"
            sub="تم تسليمها للعميل"
          />
          <KPICard
            label="طلبات مراجعة مرسلة"
            value={stats.review_requests_sent}
            icon="fa-solid fa-envelope-circle-check"
            iconColor="#10b981"
            sub="تم إرسالها بنجاح"
          />
          <KPICard
            label="طلبات مراجعة معلقة"
            value={stats.pending_review_shipments}
            icon="fa-clock"
            iconColor="#f59e0b"
            sub="لم تُرسل بعد"
          />
          <KPICard
            label="رسائل مراجعة فاشلة"
            value={stats.failed_review_messages}
            icon="fa-circle-exclamation"
            iconColor="#ef4444"
            sub="فشل إرسالها أو تسليمها"
          />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">أحدث الشحنات</h2>
        </div>

        {shipments.length === 0 ? (
          <EmptyState title="لا توجد شحنات" desc="لم يتم العثور على بيانات شحنات لهذه الفترة." icon="fa-truck" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>رقم الشحنة</th>
                  <th>الحالة</th>
                  <th>مراجعة أُرسلت</th>
                  <th>تاريخ التسليم</th>
                  <th>العميل</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>{shipment.order_id || 'غير متوفر'}</td>
                    <td>{shipment.salla_shipment_id}</td>
                    <td>
                      <Badge variant={shipment.shipment_status === 'delivered' ? 'success' : shipment.shipment_status === 'shipped' ? 'info' : 'muted'}>
                        {shipment.shipment_status || 'غير معروف'}
                      </Badge>
                    </td>
                    <td>
                      {shipment.review_sent ? (
                        <Badge variant="success">نعم</Badge>
                      ) : (
                        <Badge variant="warning">لا</Badge>
                      )}
                    </td>
                    <td>{shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleDateString('ar-SA') : 'غير متوفر'}</td>
                    <td>{shipment.customer_id}</td>
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
