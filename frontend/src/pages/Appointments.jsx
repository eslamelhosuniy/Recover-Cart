import { useState, useEffect } from 'react'
import { appointmentsApi, storesApi } from '../api/client'
import { useNotification } from '../contexts/NotificationContext'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'

export default function Appointments() {
  const { showNotification } = useNotification()
  const [appointments, setAppointments] = useState([])
  const [stats, setStats] = useState({ total: 0, upcoming: 0, confirmed: 0, reminded: 0, cancelled: 0 })
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [showWebhookGuide, setShowWebhookGuide] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [total, setTotal] = useState(0)

  const activeStoreId = localStorage.getItem('active_store_id') || localStorage.getItem('activeStoreId') || ''
  const { page, limit, skip, handlePageChange, resetPage } = usePagination(10)

  // Construct the active Webhook URL for GoHighLevel
  const webhookUrl = `${window.location.origin}/api/v1/webhooks/ghl${activeStoreId ? `?store_id=${activeStoreId}` : ''}`

  useEffect(() => {
    fetchAppointments()
    fetchStats()
  }, [skip, statusFilter, startDate, endDate, activeStoreId])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const res = await appointmentsApi.list(skip, limit, statusFilter, search, startDate, endDate)
      const data = res.data
      setAppointments(data.data || [])
      setTotal(data.total || 0)
    } catch (err) {
      showNotification(err.response?.data?.detail || 'فشل في جلب قائمة المواعيد', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await appointmentsApi.stats()
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch appointment stats:', err)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    resetPage()
    fetchAppointments()
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    showNotification('تم نسخ رابط الـ Webhook بنجاح!', 'success')
    setTimeout(() => setCopiedWebhook(false), 3000)
  }

  const handleSendReminder = async (apptId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [apptId]: 'reminder' }))
      const res = await appointmentsApi.sendReminder(apptId)
      showNotification(res.data?.message || 'تم إرسال رسالة التذكير عبر الواتساب بنجاح!', 'success')
      fetchAppointments()
      fetchStats()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'فشل في إرسال التذكير عبر الواتساب', 'error')
    } finally {
      setActionLoading((prev) => ({ ...prev, [apptId]: null }))
    }
  }

  const handleSendConfirmation = async (apptId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [apptId]: 'confirmation' }))
      const res = await appointmentsApi.sendConfirmation(apptId)
      showNotification(res.data?.message || 'تم إرسال رسالة التأكيد عبر الواتساب بنجاح!', 'success')
      fetchAppointments()
      fetchStats()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'فشل في إرسال رسالة التأكيد', 'error')
    } finally {
      setActionLoading((prev) => ({ ...prev, [apptId]: null }))
    }
  }

  const handleDelete = async (apptId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الموعد من السجلات؟')) return
    try {
      await appointmentsApi.delete(apptId)
      showNotification('تم حذف الموعد بنجاح', 'success')
      fetchAppointments()
      fetchStats()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'فشل في حذف الموعد', 'error')
    }
  }

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—'
    try {
      const d = new Date(dtStr)
      return d.toLocaleString('ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return dtStr
    }
  }

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'booked':
      case 'confirmed':
        return <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginLeft: '4px' }} />مؤكد</span>
      case 'rescheduled':
        return <span className="badge badge-info"><i className="fa-solid fa-arrows-rotate" style={{ marginLeft: '4px' }} />مُعاد جدولته</span>
      case 'cancelled':
      case 'canceled':
        return <span className="badge badge-danger"><i className="fa-solid fa-circle-xmark" style={{ marginLeft: '4px' }} />ملغي</span>
      case 'completed':
        return <span className="badge badge-accent"><i className="fa-solid fa-flag-checkered" style={{ marginLeft: '4px' }} />مكتمل</span>
      default:
        return <span className="badge badge-neutral">{status || 'غير محدد'}</span>
    }
  }

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: 0 }}>
            <i className="fa-solid fa-calendar-check" style={{ color: 'var(--primary-color, #6366f1)' }} />
            حجوزات الكاليندر (GoHighLevel)
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>
            أتمتة استقبال مواعيد GoHighLevel عبر الـ Webhook وإرسال تذكيرات وتأكيدات الواتساب الفورية والمجدولة
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => setShowWebhookGuide(!showWebhookGuide)}
          style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}
        >
          <i className="fa-solid fa-plug" />
          {showWebhookGuide ? 'إخفاء إعدادات الـ Webhook' : 'إعداد الربط مع GoHighLevel'}
        </button>
      </div>

      {/* Webhook Configuration Card */}
      {showWebhookGuide && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div className="card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <i className="fa-solid fa-link" style={{ color: '#6366f1' }} />
              رابط الـ Webhook لمنصة GoHighLevel
            </h3>
          </div>
          <div className="card-body" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              قم بنسخ هذا الرابط وضعه في إعدادات الأتمتة (Workflows) داخل حسابك في GoHighLevel ليتم إرسال بيانات كل حجز جديد أو تعديل موعد تلقائياً:
            </p>
            
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                  background: 'var(--bg-card, #1e293b)',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  direction: 'ltr',
                  fontSize: '.9rem'
                }}
              />
              <button
                type="button"
                className={`btn ${copiedWebhook ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyWebhook}
                style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.75rem 1.25rem' }}
              >
                <i className={`fa-solid ${copiedWebhook ? 'fa-check' : 'fa-copy'}`} />
                {copiedWebhook ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', fontSize: '.85rem' }}>
              <strong style={{ display: 'block', marginBottom: '.5rem', color: 'var(--text-main)' }}>
                <i className="fa-solid fa-list-check" style={{ marginLeft: '.5rem', color: '#10b981' }} />
                خطوات الربط في سير العمل (GoHighLevel Workflow):
              </strong>
              <ol style={{ margin: 0, paddingRight: '1.5rem', lineHeight: '1.8', color: 'var(--text-muted)' }}>
                <li>افتح حسابك في GoHighLevel ثم انتقل إلى <strong>Automation &gt; Workflows</strong>.</li>
                <li>أنشئ سير عمل جديد أو عدّل سير العمل الحالي الخاص بحجز المواعيد.</li>
                <li>عيّن الـ Trigger على: <strong>Customer Booked Appointment</strong>.</li>
                <li>أضف Action جديد من نوع: <strong>Custom Webhook (POST)</strong>.</li>
                <li>الصق الرابط المنسوخ أعلاه في خانة الـ URL واختر <code>POST</code>.</li>
                <li>احفظ ونشّط الـ Workflow (Publish &amp; Save). سيصل كل حجز جديد وتتولى المنصة إرسال التذكيرات تلقائياً!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className="fa-solid fa-calendar-days" />
          </div>
          <div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>إجمالي المواعيد</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className="fa-solid fa-clock" />
          </div>
          <div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>المواعيد القادمة</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.upcoming}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className="fa-brands fa-whatsapp" />
          </div>
          <div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>تم تذكيرهم بنجاح</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.reminded}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            <i className="fa-solid fa-calendar-xmark" />
          </div>
          <div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>حجوزات ملغاة</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.cancelled}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <i className="fa-solid fa-search" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="ابحث باسم العميل، الهاتف، الإيميل، التقويم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '.65rem 2.5rem .65rem .75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-body)' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                resetPage()
              }}
              style={{ padding: '.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)' }}
            >
              <option value="">جميع الحالات</option>
              <option value="upcoming">المواعيد القادمة فقط</option>
              <option value="reminded">تم التذكير</option>
              <option value="booked">حجز مؤكد (Booked)</option>
              <option value="cancelled">ملغي (Cancelled)</option>
              <option value="rescheduled">مُعاد جدولته (Rescheduled)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '.6rem .75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-body)' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '.6rem .75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-body)' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '.65rem 1.25rem' }}>
              <i className="fa-solid fa-filter" />
              تصفية
            </button>
          </div>
        </form>
      </div>

      {/* Appointments Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>
                <th style={{ padding: '1rem' }}>العميل</th>
                <th style={{ padding: '1rem' }}>التقويم / الخدمة</th>
                <th style={{ padding: '1rem' }}>تاريخ وتوقيت الموعد</th>
                <th style={{ padding: '1rem' }}>رابط الاجتماع</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem' }}>حالة الأتمتة والتذكير</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '.5rem', display: 'block' }} />
                    جاري تحميل المواعيد...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2rem', marginBottom: '.75rem', display: 'block', opacity: 0.5 }} />
                    لا توجد حجوزات مواعيد مسجلة حتى الآن.
                    <div style={{ marginTop: '.5rem', fontSize: '.85rem' }}>
                      قم بربط الـ Webhook مع GoHighLevel لبدء استقبال الحجوزات وأتمتة التذكيرات تلقائياً.
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => {
                  const isLoadingReminder = actionLoading[appt.id] === 'reminder'
                  const isLoadingConfirm = actionLoading[appt.id] === 'confirmation'

                  return (
                    <tr key={appt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {/* Customer Info */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{appt.customer_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                          <i className="fa-solid fa-phone" style={{ fontSize: '.75rem' }} />
                          <span style={{ direction: 'ltr' }}>{appt.customer_phone}</span>
                        </div>
                        {appt.customer_email && (
                          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{appt.customer_email}</div>
                        )}
                      </td>

                      {/* Calendar Name */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{appt.calendar_name || 'موعد عام'}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ID: {appt.ghl_appointment_id}
                        </div>
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                          {formatDateTime(appt.start_time)}
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          {appt.selected_timezone || 'توقيت المتجر'}
                        </div>
                      </td>

                      {/* Meeting URL */}
                      <td style={{ padding: '1rem' }}>
                        {appt.meeting_url ? (
                          <a
                            href={appt.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', padding: '.3rem .65rem' }}
                          >
                            <i className="fa-solid fa-video" style={{ color: '#10b981' }} />
                            رابط الميتنج
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(appt.status)}
                      </td>

                      {/* Automation Status */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                          {appt.confirmation_sent ? (
                            <span style={{ fontSize: '.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                              <i className="fa-solid fa-circle-check" />
                              تأكيد فوري: نعم
                            </span>
                          ) : (
                            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                              تأكيد فوري: معلق
                            </span>
                          )}

                          {appt.reminder_sent ? (
                            <span style={{ fontSize: '.75rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                              <i className="fa-solid fa-bell" />
                              تذكير الموعد: تم الإرسال
                            </span>
                          ) : (
                            <span style={{ fontSize: '.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                              <i className="fa-solid fa-hourglass-half" />
                              تذكير الموعد: مجدول تلقائياً
                            </span>
                          )}

                          {appt.manual_reminders_count > 0 && (
                            <span style={{ fontSize: '.75rem', color: '#a855f7' }}>
                              تذكير يدوي ({appt.manual_reminders_count})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                          {/* Send WhatsApp Reminder Now */}
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={isLoadingReminder || isLoadingConfirm}
                            onClick={() => handleSendReminder(appt.id)}
                            title="إرسال تذكير واتساب فوري للعميل الآن"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.8rem', padding: '.4rem .75rem' }}
                          >
                            <i className={`fa-brands fa-whatsapp ${isLoadingReminder ? 'fa-spin' : ''}`} />
                            {isLoadingReminder ? 'جاري الإرسال...' : 'إرسال تذكير الآن'}
                          </button>

                          {/* View details modal */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setSelectedAppt(appt)}
                            title="عرض تفاصيل الموعد والبيانات الأصلية"
                            style={{ padding: '.4rem .6rem' }}
                          >
                            <i className="fa-solid fa-eye" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(appt.id)}
                            title="حذف الموعد"
                            style={{ padding: '.4rem .6rem' }}
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div style={{ padding: '1.25rem 1rem', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              total={total}
              limit={limit}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <div className="modal-overlay visible" onClick={() => setSelectedAppt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                <i className="fa-solid fa-calendar-check" style={{ color: '#6366f1', marginLeft: '.5rem' }} />
                تفاصيل حجز الموعد
              </h3>
              <button className="btn btn-icon" onClick={() => setSelectedAppt(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem 0', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>اسم العميل:</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedAppt.customer_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>رقم الجوال:</div>
                  <div style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right' }}>{selectedAppt.customer_phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>البريد الإلكتروني:</div>
                  <div>{selectedAppt.customer_email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>التقويم / الخدمة:</div>
                  <div style={{ fontWeight: 600 }}>{selectedAppt.calendar_name || 'موعد عام'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>وقت بدء الموعد:</div>
                  <div style={{ fontWeight: 700, color: '#38bdf8' }}>{formatDateTime(selectedAppt.start_time)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>المنطقة الزمنية:</div>
                  <div>{selectedAppt.selected_timezone || selectedAppt.customer_timezone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>رابط الاجتماع / العنوان:</div>
                  <div>
                    {selectedAppt.meeting_url ? (
                      <a href={selectedAppt.meeting_url} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', wordBreak: 'break-all' }}>
                        {selectedAppt.meeting_url}
                      </a>
                    ) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>معرّف الموعد (GHL Appointment ID):</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{selectedAppt.ghl_appointment_id}</div>
                </div>
              </div>

              {/* Raw JSON Payload Accordion */}
              {selectedAppt.raw_payload && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem', color: 'var(--text-muted)' }}>
                    البيانات الأصلية الواردة من Webhook (Raw Payload):
                  </div>
                  <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', fontSize: '.75rem', maxHeight: '200px', overflowY: 'auto', direction: 'ltr', textAlign: 'left', color: '#a5f3fc' }}>
                    {JSON.stringify(selectedAppt.raw_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '.75rem', display: 'flex', justifyContent: 'flex-end', gap: '.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleSendReminder(selectedAppt.id)
                  setSelectedAppt(null)
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}
              >
                <i className="fa-brands fa-whatsapp" />
                إرسال تذكير واتساب الآن
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedAppt(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
