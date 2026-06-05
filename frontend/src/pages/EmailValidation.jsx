import { useState, useEffect, useCallback } from 'react'
import KPICard from '../components/ui/KPICard'
import Spinner from '../components/ui/Spinner'
import { emailValidationApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'

export default function EmailValidation() {
  const { activeStore, loading: authLoading } = useAuth()
  const { showNotification } = useNotification()
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)
  
  const [contacts, setContacts] = useState([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [page, setPage] = useState(1)
  const [tableLoading, setTableLoading] = useState(false)
  const limit = 20

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await emailValidationApi.stats()
      setStats(res.data)
    } catch (err) {
      console.error('Error fetching email validation stats:', err)
      showNotification('error', 'حدث خطأ أثناء جلب إحصائيات التحقق من الإيميلات')
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [showNotification])

  const fetchContacts = useCallback(async (currentPage = 1) => {
    setTableLoading(true)
    try {
      const skip = (currentPage - 1) * limit
      const res = await emailValidationApi.listContacts(skip, limit)
      setContacts(res.data.data)
      setTotalContacts(res.data.total)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      showNotification('error', 'حدث خطأ أثناء جلب قائمة الإيميلات')
    } finally {
      setTableLoading(false)
    }
  }, [limit, showNotification])

  useEffect(() => {
    if (authLoading || !activeStore) return
    fetchStats()
    fetchContacts(page)
    
    // Auto-refresh every 10 seconds if there are pending items
    const interval = setInterval(() => {
      setStats((prevStats) => {
        if (prevStats && prevStats.pending > 0) {
          fetchStats()
          fetchContacts(page)
        }
        return prevStats
      })
    }, 10000)
    
    return () => clearInterval(interval)
  }, [fetchStats, fetchContacts, activeStore, authLoading, page])

  const handleStartValidation = async () => {
    setStarting(true)
    try {
      await emailValidationApi.start()
      showNotification('success', 'تم بدء عملية التحقق في الخلفية')
      // Refresh immediately to show pending status changes if any
      setTimeout(() => fetchStats(true), 1000)
    } catch (err) {
      console.error('Error starting email validation:', err)
      showNotification('error', 'حدث خطأ أثناء بدء التحقق')
    } finally {
      setStarting(false)
    }
  }

  if (loading || (authLoading && !activeStore)) {
    return <Spinner center />
  }

  return (
    <div className="animate-in">
      {/* Top Action */}
      <div className="d-flex justify-between align-center mb-4">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }} className="mb-1">فحص صحة الإيميلات</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            تتبع حالة جهات الاتصال الخاصة بك وقم بإزالة الإيميلات الوهمية وغير الصالحة.
          </p>
        </div>
        <div className="d-flex align-center gap-2">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{ height: '36px' }}
          >
            <i className={`fa-solid fa-rotate-right ${refreshing ? 'fa-spin' : ''}`} />
            تحديث
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleStartValidation}
            disabled={starting || (stats && stats.pending === 0 && stats.total > 0 && stats.pending === 0 && stats.valid + stats.invalid + stats.risky === stats.total)}
            style={{ height: '36px' }}
          >
            {starting ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-bolt" />
            )}
            بدء التحقق
          </button>
        </div>
      </div>

      {stats && stats.pending > 0 && (
        <div className="mb-4" style={{ 
          padding: '1rem', 
          backgroundColor: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.2)', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <i className="fa-solid fa-circle-notch fa-spin text-accent" style={{ fontSize: '1.5rem' }}></i>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--accent)' }}>جاري التحقق من الإيميلات في الخلفية...</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>يوجد {stats.pending} إيميل في قائمة الانتظار، سيتم التحديث تلقائياً.</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div className="kpi-grid">
          <KPICard
            label="إجمالي الإيميلات"
            value={stats.total}
            icon="fa-envelope"
            iconColor="#8b5cf6"
            sub="جميع جهات الاتصال المزامنة"
          />
          <KPICard
            label="إيميلات صالحة"
            value={stats.valid}
            icon="fa-check-circle"
            iconColor="#10b981"
            sub="سليمة وجاهزة للاستقبال"
          />
          <KPICard
            label="إيميلات خطرة"
            value={stats.risky}
            icon="fa-exclamation-triangle"
            iconColor="#f59e0b"
            sub="نطاق مؤقت أو مشاكل DNS"
            highlight
          />
          <KPICard
            label="إيميلات غير صالحة"
            value={stats.invalid}
            icon="fa-times-circle"
            iconColor="#ef4444"
            sub="بنية خاطئة أو مرفوضة"
          />
          <KPICard
            label="قيد الانتظار"
            value={stats.pending}
            icon="fa-hourglass-half"
            iconColor="#64748b"
            sub="في طابور الفحص"
          />
        </div>
      )}

      {/* Contacts Table */}
      <div className="card mt-4" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div className="d-flex justify-between align-center mb-3">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>تفاصيل الإيميلات</h3>
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            إجمالي السجلات: {totalContacts}
          </div>
        </div>

        {tableLoading ? (
          <div style={{ padding: '2rem 0' }}>
            <Spinner center />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '3rem 0' }}>
            <i className="fa-solid fa-inbox mb-2" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
            <p>لا توجد إيميلات مسجلة حتى الآن.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>الإيميل</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>الاسم</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>حالة الفحص</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>السبب</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem 0.5rem', dir: 'ltr', textAlign: 'left', fontWeight: 500 }}>{contact.email}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{contact.first_name || '-'} {contact.last_name || ''}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {contact.validation_status === 'pending' && <span className="badge badge-secondary"><i className="fa-solid fa-hourglass-half ml-1"></i> قيد الانتظار</span>}
                      {contact.validation_status === 'valid' && <span className="badge badge-success"><i className="fa-solid fa-check-circle ml-1"></i> صالح</span>}
                      {contact.validation_status === 'risky' && <span className="badge badge-warning"><i className="fa-solid fa-exclamation-triangle ml-1"></i> خطر</span>}
                      {contact.validation_status === 'invalid' && <span className="badge badge-danger"><i className="fa-solid fa-times-circle ml-1"></i> غير صالح</span>}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{contact.validation_reason || '-'}</td>
                    <td style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', dir: 'ltr', textAlign: 'left' }}>
                      {new Date(contact.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalContacts > limit && (
          <div className="d-flex justify-between align-center mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || tableLoading}
            >
              السابق
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              صفحة {page} من {Math.ceil(totalContacts / limit)}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(Math.ceil(totalContacts / limit), p + 1))}
              disabled={page >= Math.ceil(totalContacts / limit) || tableLoading}
            >
              التالي
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
