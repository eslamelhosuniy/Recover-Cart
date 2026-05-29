import { useState, useEffect } from 'react'
import { emailMarketingApi } from '../api/client'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'

export default function EmailContacts() {
  const { activeStore } = useAuth()
  const activeStoreId = activeStore?.id || ''
  const { showNotification } = useNotification()

  const [activeTab, setActiveTab] = useState('manual') // 'manual' or 'csv'
  const [loading, setLoading] = useState(false)
  const [lists, setLists] = useState([])
  const [showListModal, setShowListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    list_id: ''
  })

  // CSV Form State
  const [csvFile, setCsvFile] = useState(null)
  const [csvListId, setCsvListId] = useState('')

  const fetchLists = () => {
    if (!activeStoreId) return
    emailMarketingApi.getLists(activeStoreId)
      .then(res => {
        if (res.data && res.data.result) {
          setLists(res.data.result)
        } else if (Array.isArray(res.data)) {
          setLists(res.data)
        }
      })
      .catch(err => console.error("Failed to fetch lists", err))
  }

  useEffect(() => {
    fetchLists()
  }, [activeStoreId])

  const handleCreateList = async (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      await emailMarketingApi.createList(activeStoreId, { name: newListName })
      showNotification("تم إنشاء القائمة بنجاح", "success")
      setShowListModal(false)
      setNewListName('')
      fetchLists() // Refresh lists
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إنشاء القائمة", "error")
    } finally {
      setCreatingList(false)
    }
  }

  const handleManualChange = (e) => {
    const { name, value } = e.target
    setManualForm(prev => ({ ...prev, [name]: value }))
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await emailMarketingApi.createContact(activeStoreId, manualForm)
      showNotification("تم إضافة جهة الاتصال بنجاح إلى طابور المزامنة", "success")
      setManualForm({ email: '', first_name: '', last_name: '', list_id: manualForm.list_id })
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إضافة جهة الاتصال", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleCsvSubmit = async (e) => {
    e.preventDefault()
    if (!csvFile) {
      showNotification("الرجاء اختيار ملف CSV", "error")
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append("file", csvFile)
    if (csvListId) {
      formData.append("list_id", csvListId)
    }

    try {
      const res = await emailMarketingApi.uploadContacts(activeStoreId, formData)
      showNotification(res.data.message || "تم رفع الملف بنجاح", "success")
      setCsvFile(null)
      // Reset file input visually
      document.getElementById('csv_file').value = null
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل رفع الملف", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="mb-4">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
          جهات الاتصال
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          أضف جهات الاتصال الخاصة بك إما يدوياً أو عن طريق رفع ملف CSV لتتم مزامنتها مع SendGrid.
        </p>
      </div>

      {/* Custom Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1.5rem',
            color: activeTab === 'manual' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'manual' ? '2px solid var(--primary-color)' : '2px solid transparent',
            fontWeight: activeTab === 'manual' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-user-plus" />
          إضافة يدوية
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1.5rem',
            color: activeTab === 'csv' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'csv' ? '2px solid var(--primary-color)' : '2px solid transparent',
            fontWeight: activeTab === 'csv' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-file-csv" />
          رفع ملف CSV
        </button>
      </div>

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}
      >
        {activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>البريد الإلكتروني <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="email"
                  name="email"
                  required
                  className="form-input"
                  value={manualForm.email}
                  onChange={handleManualChange}
                  dir="ltr"
                  placeholder="user@example.com"
                  style={{ height: '42px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>قائمة SendGrid (اختياري)</span>
                  <button type="button" onClick={() => setShowListModal(true)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                    <i className="fa-solid fa-plus ml-1" /> إنشاء قائمة جديدة
                  </button>
                </label>
                <select
                  name="list_id"
                  className="form-input"
                  value={manualForm.list_id}
                  onChange={handleManualChange}
                  style={{ height: '42px', padding: '0 0.75rem', boxSizing: 'border-box' }}
                >
                  <option value="">استخدام القائمة الافتراضية للمتجر</option>
                  {lists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>الاسم الأول (اختياري)</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-input"
                  value={manualForm.first_name}
                  onChange={handleManualChange}
                  placeholder="محمد"
                  style={{ height: '42px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>الاسم الأخير (اختياري)</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-input"
                  value={manualForm.last_name}
                  onChange={handleManualChange}
                  placeholder="أحمد"
                  style={{ height: '42px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 2rem', height: '42px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-plus ml-2" /> إضافة جهة الاتصال</>}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCsvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>قائمة SendGrid للرفع إليها (اختياري)</span>
                <button type="button" onClick={() => setShowListModal(true)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                  <i className="fa-solid fa-plus ml-1" /> إنشاء قائمة جديدة
                </button>
              </label>
              <select
                name="csvListId"
                className="form-input"
                value={csvListId}
                onChange={(e) => setCsvListId(e.target.value)}
                style={{ height: '42px', padding: '0 0.75rem', boxSizing: 'border-box' }}
              >
                <option value="">استخدام القائمة الافتراضية للمتجر</option>
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>ملف CSV <span style={{ color: '#ef4444' }}>*</span></label>
              <div 
                style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: '12px', 
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  position: 'relative'
                }}
              >
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>اسحب وأفلت ملف CSV هنا</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  يجب أن يحتوي الملف على عمود باسم `email`، ويمكن إضافة أعمدة `first_name` و `last_name` بشكل اختياري.
                </p>
                <input
                  type="file"
                  id="csv_file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                {csvFile && (
                  <div style={{ marginTop: '1rem', color: '#10b981', fontWeight: 600 }}>
                    <i className="fa-solid fa-check-circle ml-2" /> تم اختيار: {csvFile.name}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 2rem', height: '42px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-upload ml-2" /> رفع البيانات المجمعة</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Create List Modal */}
      {showListModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="animate-in" style={{
            background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.95) 0%, rgba(15, 17, 26, 0.98) 100%)',
            border: '1px solid var(--border)', borderRadius: '12px',
            padding: '2rem', width: '90%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-list" style={{ color: '#3b82f6' }} />
              إنشاء قائمة جديدة
            </h3>
            <form onSubmit={handleCreateList}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم القائمة</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="مثال: عملاء VIP"
                  style={{ height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowListModal(false)} style={{ height: '38px', padding: '0 1.5rem' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={creatingList} style={{ height: '38px', padding: '0 1.5rem' }}>
                  {creatingList ? <i className="fa-solid fa-spinner fa-spin" /> : 'إنشاء الحفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
