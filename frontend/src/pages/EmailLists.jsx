import { useState, useEffect } from 'react'
import { emailMarketingApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'
import { createPortal } from 'react-dom'

export default function EmailLists() {
  const { activeStoreId } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  
  // Pagination for lists (client-side since API returns all)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  
  // List details modal
  const [showListModal, setShowListModal] = useState(false)
  const [selectedList, setSelectedList] = useState(null)
  const [listContacts, setListContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  
  // Pagination for list contacts (server-side)
  const [contactsPage, setContactsPage] = useState(1)
  const [contactsTotal, setContactsTotal] = useState(0)
  const contactsPageSize = 20
  
  // Add new list
  const [showAddModal, setShowAddModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchLists = async () => {
    if (!activeStoreId) return
    setLoading(true)
    try {
      const res = await emailMarketingApi.getLists(activeStoreId)
      setLists(Array.isArray(res.data) ? res.data : (res.data.result || []))
    } catch (err) {
      showNotification("فشل جلب القوائم", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLists()
  }, [activeStoreId])

  const handleDelete = async (listId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه القائمة؟")) return
    try {
      await emailMarketingApi.deleteList(activeStoreId, listId)
      showNotification("تم حذف القائمة بنجاح", "success")
      fetchLists()
    } catch(err) {
      showNotification("فشل حذف القائمة", "error")
    }
  }

  const handleAddList = async (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setActionLoading(true)
    try {
      await emailMarketingApi.createList(activeStoreId, { name: newListName })
      showNotification("تم إضافة القائمة بنجاح", "success")
      setNewListName('')
      setShowAddModal(false)
      fetchLists()
    } catch (err) {
      showNotification("فشل إضافة القائمة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const viewListContacts = async (list) => {
    setSelectedList(list)
    setContactsPage(1)
    setShowListModal(true)
    await fetchContacts(list.id, 1)
  }

  const fetchContacts = async (listId, pageNum) => {
    setContactsLoading(true)
    try {
      const skip = (pageNum - 1) * contactsPageSize
      const res = await emailMarketingApi.getContactsByList(activeStoreId, listId, { skip, limit: contactsPageSize })
      setListContacts(res.data.items || [])
      setContactsTotal(res.data.total || 0)
    } catch(err) {
      showNotification("فشل جلب جهات الاتصال", "error")
    } finally {
      setContactsLoading(false)
    }
  }

  const handleContactsPageChange = async (newPage) => {
    setContactsPage(newPage)
    if (selectedList) {
      await fetchContacts(selectedList.id, newPage)
    }
  }

  // Client-side pagination logic for lists
  const paginatedLists = lists.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(lists.length / pageSize)

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
          <h1 className="page-title"><i className="fa-solid fa-list-ul text-primary" /> إدارة قوائم الاتصال</h1>
          <p className="page-subtitle">قم بإدارة وتقسيم جهات اتصالك لتوجيه حملاتك الإعلانية</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-plus" /> إضافة قائمة جديدة
          </button>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '3rem 0' }}><Spinner center /></div>
        ) : lists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><i className="fa-solid fa-list-ul" /></div>
            <h3>لا توجد قوائم</h3>
            <p>قم بإنشاء قائمة جديدة للبدء في تنظيم جهات اتصالك.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>اسم القائمة</th>
                    <th>عدد جهات الاتصال</th>
                    <th style={{ width: '150px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLists.map(list => (
                    <tr key={list.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{list.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {list.id}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{list.contact_count || 0} مشترك</span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-secondary" onClick={() => viewListContacts(list)}>
                            <i className="fa-solid fa-users"></i> استعراض
                          </button>
                          <button className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => handleDelete(list.id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
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
              <i className="fa-solid fa-plus text-primary" /> إضافة قائمة جديدة
            </h3>
            <form onSubmit={handleAddList}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم القائمة <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" required className="form-input" value={newListName} onChange={(e) => setNewListName(e.target.value)} style={{ height: '42px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Contacts Modal */}
      {showListModal && selectedList && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999999, display: 'flex', padding: '3rem 1rem' }} onClick={() => setShowListModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '90%', maxWidth: '800px', margin: 'auto', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center mb-4">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-users text-primary" /> مشتركي قائمة: {selectedList.name}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowListModal(false)}>إغلاق</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {contactsLoading ? (
                <div style={{ padding: '2rem 0' }}><Spinner center /></div>
              ) : listContacts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-muted)' }}><i className="fa-solid fa-user-xmark" /></div>
                  <h4>القائمة فارغة</h4>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>البريد الإلكتروني</th>
                        <th>الاسم</th>
                        <th>تاريخ الإضافة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listContacts.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.email}</td>
                          <td>{[c.first_name, c.last_name].filter(Boolean).join(' ') || '-'}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {!contactsLoading && contactsTotal > contactsPageSize && (
              <div className="pagination" style={{ padding: '1rem 0 0 0', display: 'flex', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
                <button className="btn btn-sm btn-secondary" disabled={contactsPage === 1} onClick={() => handleContactsPageChange(contactsPage - 1)}>السابق</button>
                <span style={{ padding: '0.25rem 0.5rem', fontWeight: 600 }}>{contactsPage} / {Math.ceil(contactsTotal / contactsPageSize)}</span>
                <button className="btn btn-sm btn-secondary" disabled={contactsPage >= Math.ceil(contactsTotal / contactsPageSize)} onClick={() => handleContactsPageChange(contactsPage + 1)}>التالي</button>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  )
}
