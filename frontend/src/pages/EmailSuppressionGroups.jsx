import { useState, useEffect } from 'react'
import { emailMarketingApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import Spinner from "../components/ui/Spinner";
import { createPortal } from 'react-dom'

export default function EmailSuppressionGroups() {
  const { activeStoreId } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Add new group modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', is_default: false })
  const [actionLoading, setActionLoading] = useState(false)

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchGroups = async () => {
    if (!activeStoreId) return
    setLoading(true)
    try {
      const res = await emailMarketingApi.getSuppressionGroups(activeStoreId)
      const data = res.data
      setGroups(Array.isArray(data) ? data : (data.suppression_groups || []))
    } catch (err) {
      showNotification("فشل جلب مجموعات الاستبعاد", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [activeStoreId])

  const handleDelete = async (groupId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المجموعة؟ سيؤدي ذلك لإلغاء الاستبعاد المرتبط بها.")) return
    try {
      await emailMarketingApi.deleteSuppressionGroup(activeStoreId, groupId)
      showNotification("تم حذف المجموعة بنجاح", "success")
      fetchGroups()
    } catch (err) {
      showNotification("فشل حذف المجموعة", "error")
    }
  }

  const handleAddGroup = async (e) => {
    e.preventDefault()
    if (!newGroup.name.trim()) return
    setActionLoading(true)
    try {
      await emailMarketingApi.createSuppressionGroup(activeStoreId, newGroup)
      showNotification("تم إضافة المجموعة بنجاح", "success")
      setNewGroup({ name: '', description: '', is_default: false })
      setShowAddModal(false)
      fetchGroups()
    } catch (err) {
      showNotification("فشل إضافة المجموعة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const paginatedGroups = groups.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(groups.length / pageSize)

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
          <h1 className="page-title"><i className="fa-solid fa-user-slash text-primary" /> مجموعات الاستبعاد (Suppression)</h1>
          <p className="page-subtitle">أدر القوائم التي لا ترغب في إرسال الحملات إليها</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-plus" /> مجموعة جديدة
          </button>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '3rem 0' }}><Spinner center /></div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><i className="fa-solid fa-user-shield" /></div>
            <h3>لا توجد مجموعات استبعاد</h3>
            <p>أضف مجموعة جديدة لتنظيم الإيميلات المستبعدة.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>اسم المجموعة</th>
                    <th>الوصف</th>
                    <th>افتراضية</th>
                    <th style={{ width: '100px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map(group => (
                    <tr key={group.id}>
                      <td style={{ fontWeight: 600 }}>{group.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{group.description || '-'}</td>
                      <td>
                        {group.is_default ? (
                          <span className="badge badge-success"><i className="fa-solid fa-check" /> نعم</span>
                        ) : (
                          <span className="badge badge-secondary">لا</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => handleDelete(group.id)} title="حذف المجموعة">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999999, display: 'flex', padding: '3rem 1rem' }} onClick={() => setShowAddModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '90%', maxWidth: '400px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-plus text-primary" /> مجموعة استبعاد جديدة
            </h3>
            <form onSubmit={handleAddGroup}>
              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم المجموعة <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" required className="form-input" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} style={{ height: '42px' }} />
              </div>
              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>الوصف</label>
                <textarea className="form-input" rows="3" value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} />
              </div>
              <div className="form-group mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="is_default" checked={newGroup.is_default} onChange={(e) => setNewGroup({ ...newGroup, is_default: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                <label htmlFor="is_default" style={{ fontSize: '0.9rem', cursor: 'pointer', margin: 0 }}>جعلها المجموعة الافتراضية</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
        , document.body)}
    </div>
  )
}
