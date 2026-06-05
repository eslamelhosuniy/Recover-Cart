import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { emailMarketingApi, emailValidationApi } from '../api/client'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'

export default function EmailContacts() {
  const { activeStore } = useAuth()
  const activeStoreId = activeStore?.id || ''
  const { showNotification } = useNotification()

  // Data States
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState([])
  const [campaigns, setCampaigns] = useState([])
  
  // Pagination & Filters
  const [page, setPage] = useState(1)
  const limit = 20
  const [filters, setFilters] = useState({
    search: '',
    list_id: '',
    campaign_id: '',
    validation_status: '',
    sync_status: '',
    sent_in_campaigns: '', // 'true' or 'false'
    start_date: '',
    end_date: ''
  })

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [editContact, setEditContact] = useState(null)
  
  // Add Contact Form
  const [manualForm, setManualForm] = useState({ email: '', first_name: '', last_name: '', list_id: '' })
  const [csvFile, setCsvFile] = useState(null)
  const [csvListId, setCsvListId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDependencies = useCallback(async () => {
    if (!activeStoreId) return
    try {
      const [listsRes, campaignsRes] = await Promise.all([
        emailMarketingApi.getLists(activeStoreId),
        emailMarketingApi.getCampaigns(activeStoreId).catch(() => ({ data: [] }))
      ])
      
      let listsData = listsRes.data?.result || listsRes.data || []
      setLists(Array.isArray(listsData) ? listsData : [])
      
      let campsData = campaignsRes.data || []
      setCampaigns(Array.isArray(campsData) ? campsData : [])
    } catch (err) {
      console.error("Failed to fetch dependencies", err)
    }
  }, [activeStoreId])

  const fetchContacts = useCallback(async () => {
    if (!activeStoreId) return
    setLoading(true)
    try {
      const skip = (page - 1) * limit
      const params = { skip, limit, ...filters }
      // Clean up empty filters
      Object.keys(params).forEach(k => {
        if (params[k] === '') delete params[k]
      })
      if (params.sent_in_campaigns) {
        params.sent_in_campaigns = params.sent_in_campaigns === 'true'
      }

      const res = await emailMarketingApi.getContacts(activeStoreId, params)
      setContacts(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error("Failed to fetch contacts", err)
      showNotification("فشل جلب قائمة جهات الاتصال", "error")
    } finally {
      setLoading(false)
    }
  }, [activeStoreId, page, limit, filters, showNotification])

  useEffect(() => {
    fetchDependencies()
  }, [fetchDependencies])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
    setPage(1) // reset to first page on filter
  }

  // Add Manual Contact
  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await emailMarketingApi.createContact(activeStoreId, manualForm)
      showNotification("تم الإضافة بنجاح", "success")
      setManualForm({ email: '', first_name: '', last_name: '', list_id: '' })
      setShowAddModal(false)
      fetchContacts()
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل الإضافة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Upload CSV
  const handleCsvSubmit = async (e) => {
    e.preventDefault()
    if (!csvFile) return showNotification("اختر ملف CSV", "error")
    setActionLoading(true)
    const formData = new FormData()
    formData.append("file", csvFile)
    if (csvListId) formData.append("list_id", csvListId)

    try {
      await emailMarketingApi.uploadContacts(activeStoreId, formData)
      showNotification("تم رفع الملف بنجاح", "success")
      setCsvFile(null)
      setShowCsvModal(false)
      fetchContacts()
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل الرفع", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Delete
  const handleDelete = async (contactId) => {
    if (!window.confirm("هل أنت متأكد من حذف جهة الاتصال هذه؟")) return
    try {
      await emailMarketingApi.deleteContact(activeStoreId, contactId)
      showNotification("تم الحذف", "success")
      fetchContacts()
    } catch (err) {
      showNotification("فشل الحذف", "error")
    }
  }

  // Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await emailMarketingApi.updateContact(activeStoreId, editContact.id, {
        email: editContact.email,
        first_name: editContact.first_name,
        last_name: editContact.last_name,
        list_id: editContact.sendgrid_list_id
      })
      showNotification("تم التعديل", "success")
      setEditContact(null)
      fetchContacts()
    } catch (err) {
      showNotification("فشل التعديل", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Validate Single
  const handleValidate = async (contactId) => {
    try {
      await emailValidationApi.validateSingle(contactId)
      showNotification("تم الفحص بنجاح", "success")
      fetchContacts()
    } catch (err) {
      showNotification("فشل الفحص", "error")
    }
  }

  const getListName = (listId) => {
    const l = lists.find(x => x.id === listId)
    return l ? l.name : listId ? 'قائمة غير معروفة' : 'غير محدد'
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '2rem' }}>
      <div className="d-flex justify-between align-center mb-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
            جهات الاتصال
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            إدارة جهات الاتصال الخاصة بك وتتبع حالتهم والقوائم التابعين لها. إجمالي: {total}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowCsvModal(true)}>
            <i className="fa-solid fa-file-csv" /> رفع CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-plus" /> إضافة جهة اتصال
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text)' }}><i className="fa-solid fa-filter ml-2"></i> تصفية وبحث</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <input
            type="text"
            name="search"
            placeholder="بحث بالاسم أو الإيميل..."
            className="form-input"
            value={filters.search}
            onChange={handleFilterChange}
            style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }}
          />

          <select name="list_id" className="form-input" value={filters.list_id} onChange={handleFilterChange} style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }}>
            <option value="">كل القوائم</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <select name="campaign_id" className="form-input" value={filters.campaign_id} onChange={handleFilterChange} style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }}>
            <option value="">تم إرسالهم في حملة...</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select name="sent_in_campaigns" className="form-input" value={filters.sent_in_campaigns} onChange={handleFilterChange} style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }}>
            <option value="">حالة استلام الحملات السابقة (الكل)</option>
            <option value="true">استلموا حملة سابقة على الأقل</option>
            <option value="false">لم يستلموا أي حملة حتى الآن</option>
          </select>

          <select name="validation_status" className="form-input" value={filters.validation_status} onChange={handleFilterChange} style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }}>
            <option value="">حالة فحص الإيميل (الكل)</option>
            <option value="pending">قيد الانتظار</option>
            <option value="valid">صالح</option>
            <option value="risky">خطر</option>
            <option value="invalid">غير صالح</option>
          </select>

          <input type="date" name="start_date" className="form-input" value={filters.start_date} onChange={handleFilterChange} style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }} title="تاريخ البدء" />
          <input type="date" name="end_date" className="form-input" value={filters.end_date} onChange={handleFilterChange} style={{ height: '40px', padding: '0 0.75rem', color: 'var(--text)' }} title="تاريخ الانتهاء" />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '3rem 0' }}><Spinner center /></div>
        ) : contacts.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '3rem 0' }}>لا توجد جهات اتصال مطابقة.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>الإيميل والاسم</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>القائمة</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>حالة الفحص</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>حالة المزامنة</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, dir: 'ltr', textAlign: 'left' }}>{c.email}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.first_name || ''} {c.last_name || ''}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {getListName(c.sendgrid_list_id)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {c.validation_status === 'pending' && <span className="badge badge-secondary">انتظار</span>}
                      {c.validation_status === 'valid' && <span className="badge badge-success">صالح</span>}
                      {c.validation_status === 'risky' && <span className="badge badge-warning">خطر</span>}
                      {c.validation_status === 'invalid' && <span className="badge badge-danger">مرفوض</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {c.sync_status === 'synced' ? <span style={{color: '#10b981'}}><i className="fa-solid fa-check"></i> متزامن</span> : <span style={{color: '#f59e0b'}}><i className="fa-solid fa-clock"></i> {c.sync_status}</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="d-flex gap-2">
                        {c.validation_status === 'pending' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleValidate(c.id)} title="فحص الإيميل الآن">
                            <i className="fa-solid fa-bolt" style={{color: '#eab308'}}></i>
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditContact(c)}>
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(c.id)} style={{ color: '#ef4444' }}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="d-flex justify-between align-center" style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>السابق</button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>صفحة {page} من {Math.ceil(total / limit)}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page >= Math.ceil(total / limit) || loading}>التالي</button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showAddModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', padding: '3rem 1rem', overflowY: 'auto', zIndex: 99999999 }} onClick={(e) => { if(e.target === e.currentTarget) { setShowAddModal(false); setShowCsvModal(false); setEditContact(null); } }}>
          <div className="card" style={{ padding: '2rem', width: '90%', maxWidth: '400px', margin: 'auto' }}>
            <h3>إضافة جهة اتصال</h3>
            <form onSubmit={handleAddSubmit}>
              <input type="email" required placeholder="الإيميل" className="form-input mb-3" value={manualForm.email} onChange={e => setManualForm({...manualForm, email: e.target.value})} />
              <input type="text" placeholder="الاسم الأول" className="form-input mb-3" value={manualForm.first_name} onChange={e => setManualForm({...manualForm, first_name: e.target.value})} />
              <input type="text" placeholder="الاسم الأخير" className="form-input mb-3" value={manualForm.last_name} onChange={e => setManualForm({...manualForm, last_name: e.target.value})} />
              <select className="form-input mb-4" value={manualForm.list_id} onChange={e => setManualForm({...manualForm, list_id: e.target.value})}>
                <option value="">القائمة الافتراضية</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <div className="d-flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {showCsvModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', padding: '3rem 1rem', overflowY: 'auto', zIndex: 99999999 }} onClick={(e) => { if(e.target === e.currentTarget) { setShowAddModal(false); setShowCsvModal(false); setEditContact(null); } }}>
          <div className="card" style={{ padding: '2rem', width: '90%', maxWidth: '400px', margin: 'auto' }}>
            <h3>رفع ملف CSV</h3>
            <form onSubmit={handleCsvSubmit}>
              <select className="form-input mb-3" value={csvListId} onChange={e => setCsvListId(e.target.value)}>
                <option value="">القائمة الافتراضية</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <input type="file" accept=".csv" className="form-input mb-4" onChange={e => setCsvFile(e.target.files[0])} />
              <div className="d-flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCsvModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>رفع</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {editContact && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', padding: '3rem 1rem', overflowY: 'auto', zIndex: 99999999 }} onClick={(e) => { if(e.target === e.currentTarget) { setShowAddModal(false); setShowCsvModal(false); setEditContact(null); } }}>
          <div className="card" style={{ padding: '2rem', width: '90%', maxWidth: '400px', margin: 'auto' }}>
            <h3>تعديل جهة اتصال</h3>
            <form onSubmit={handleEditSubmit}>
              <input type="email" required placeholder="الإيميل" className="form-input mb-3" value={editContact.email} onChange={e => setEditContact({...editContact, email: e.target.value})} />
              <input type="text" placeholder="الاسم الأول" className="form-input mb-3" value={editContact.first_name || ''} onChange={e => setEditContact({...editContact, first_name: e.target.value})} />
              <input type="text" placeholder="الاسم الأخير" className="form-input mb-3" value={editContact.last_name || ''} onChange={e => setEditContact({...editContact, last_name: e.target.value})} />
              <select className="form-input mb-4" value={editContact.sendgrid_list_id || ''} onChange={e => setEditContact({...editContact, sendgrid_list_id: e.target.value})}>
                <option value="">القائمة الافتراضية</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <div className="d-flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setEditContact(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
