import { useState, useEffect } from 'react'
import { emailMarketingApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/common/Spinner'
import { createPortal } from 'react-dom'

export default function EmailDesigns() {
  const { activeStoreId } = useAuth()
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12) // 12 for grid layout

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchDesigns = async () => {
    if (!activeStoreId) return
    setLoading(true)
    try {
      const res = await emailMarketingApi.getDesigns(activeStoreId)
      setDesigns(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      showNotification("فشل جلب التصاميم والقوالب", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDesigns()
  }, [activeStoreId])

  const handleDelete = async (designId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصميم؟ لا يمكن التراجع عن هذا الإجراء.")) return
    try {
      await emailMarketingApi.deleteDesign(activeStoreId, designId)
      showNotification("تم حذف التصميم بنجاح", "success")
      fetchDesigns()
    } catch(err) {
      showNotification("فشل حذف التصميم", "error")
    }
  }

  const paginatedDesigns = designs.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(designs.length / pageSize)

  return (
    <div className="container animate-in">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-check-circle' : notification.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`}></i>
          {notification.msg}
        </div>
      )}

      <div className="page-header d-flex justify-between align-center mb-4">
        <div>
          <h1 className="page-title"><i className="fa-solid fa-palette text-primary" /> التصاميم والقوالب</h1>
          <p className="page-subtitle">استعرض تصميمات ورسائل البريد المحفوظة في حسابك في SendGrid</p>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '3rem 0' }}><Spinner center /></div>
        ) : designs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><i className="fa-solid fa-palette" /></div>
            <h3>لا توجد تصاميم</h3>
            <p>يمكنك تصميم وحفظ قوالبك عبر لوحة تحكم SendGrid لتظهر هنا.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
              {paginatedDesigns.map(design => (
                <div key={design.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
                  <div style={{ height: '160px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: design.thumbnail_url ? `url(${design.thumbnail_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'top' }}>
                    {!design.thumbnail_url && <i className="fa-solid fa-image text-muted" style={{ fontSize: '3rem', opacity: 0.5 }} />}
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={design.name}>{design.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>آخر تعديل: {new Date(design.updated_at).toLocaleDateString()}</div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-info">{design.editor === 'design' ? 'Design Editor' : 'Code Editor'}</span>
                      <button className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => handleDelete(design.id)} title="حذف التصميم">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</button>
                <span style={{ padding: '0.25rem 0.5rem', fontWeight: 600 }}>{page} / {totalPages}</span>
                <button className="btn btn-sm btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>التالي</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
