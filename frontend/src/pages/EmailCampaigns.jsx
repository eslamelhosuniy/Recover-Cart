import { useState, useEffect } from 'react'
import { emailMarketingApi } from '../api/client'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

export default function EmailCampaigns() {
  const { activeStore } = useAuth()
  const activeStoreId = activeStore?.id || ''
  const { showNotification } = useNotification()

  const [activeTab, setActiveTab] = useState('campaign') // 'campaign' or 'single'
  const [loading, setLoading] = useState(false)
  
  // Dropdown states
  const [lists, setLists] = useState([])
  const [senders, setSenders] = useState([])
  const [suppressionGroups, setSuppressionGroups] = useState([])
  
  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', is_default: false })
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Campaign Form State
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    sender_id: '',
    list_id: '',
    suppression_group_id: '',
    custom_unsubscribe_url: ''
  })

  // Single Send Form State
  const [singleForm, setSingleForm] = useState({
    to_email: '',
    subject: '',
    html_content: '',
    from_name: ''
  })

  const fetchDropdowns = () => {
    if (!activeStoreId) return
    Promise.all([
      emailMarketingApi.getLists(activeStoreId).catch(() => ({ data: { result: [] }})),
      emailMarketingApi.getSenders(activeStoreId).catch(() => ({ data: [] })),
      emailMarketingApi.getSuppressionGroups(activeStoreId).catch(() => ({ data: [] }))
    ]).then(([listsRes, sendersRes, suppRes]) => {
      setLists(listsRes.data.result || (Array.isArray(listsRes.data) ? listsRes.data : []))
      const sData = sendersRes.data
      setSenders(Array.isArray(sData) ? sData : (sData.result || []))
      setSuppressionGroups(Array.isArray(suppRes.data) ? suppRes.data : (suppRes.data.suppression_groups || []))
    })
  }

  useEffect(() => {
    fetchDropdowns()
  }, [activeStoreId])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroup.name.trim() || !newGroup.description.trim()) return
    setCreatingGroup(true)
    try {
      await emailMarketingApi.createSuppressionGroup(activeStoreId, newGroup)
      showNotification("تم إنشاء مجموعة الاستبعاد بنجاح", "success")
      setShowGroupModal(false)
      setNewGroup({ name: '', description: '', is_default: false })
      fetchDropdowns() // Refresh dropdowns
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إنشاء المجموعة", "error")
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleCampaignChange = (e) => {
    const { name, value } = e.target
    setCampaignForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSingleChange = (e) => {
    const { name, value } = e.target
    setSingleForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCampaignSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...campaignForm,
        sender_id: parseInt(campaignForm.sender_id),
        suppression_group_id: campaignForm.suppression_group_id ? parseInt(campaignForm.suppression_group_id) : null
      }
      const res = await emailMarketingApi.createCampaign(activeStoreId, payload)
      
      // Auto-schedule it to send immediately
      if (res.data.campaign_id) {
        await emailMarketingApi.sendCampaign(activeStoreId, res.data.campaign_id)
        showNotification("تم إنشاء وجدولة الحملة بنجاح", "success")
      } else {
        showNotification("تم إنشاء الحملة", "success")
      }
      
      setCampaignForm({
        name: '',
        subject: '',
        html_content: '',
        sender_id: '',
        list_id: '',
        suppression_group_id: '',
        custom_unsubscribe_url: ''
      })
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إنشاء الحملة", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await emailMarketingApi.sendSingleEmail(activeStoreId, singleForm)
      showNotification("تمت إضافة الرسالة لطابور الإرسال بنجاح", "success")
      setSingleForm({
        to_email: '',
        subject: '',
        html_content: '',
        from_name: ''
      })
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إرسال الرسالة", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="mb-4">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
          الحملات الإعلانية والمراسلات
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          قم بإنشاء حملات تسويقية لجمهورك أو إرسال رسائل فردية مباشرة.
        </p>
      </div>

      {/* Custom Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('campaign')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1.5rem',
            color: activeTab === 'campaign' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'campaign' ? '2px solid var(--primary-color)' : '2px solid transparent',
            fontWeight: activeTab === 'campaign' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-bullhorn" />
          حملة تسويقية (قوائم)
        </button>
        <button
          onClick={() => setActiveTab('single')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1.5rem',
            color: activeTab === 'single' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'single' ? '2px solid var(--primary-color)' : '2px solid transparent',
            fontWeight: activeTab === 'single' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-paper-plane" />
          إرسال رسالة فردية
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
        {activeTab === 'campaign' ? (
          <form onSubmit={handleCampaignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم الحملة (داخلي) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-input"
                  value={campaignForm.name}
                  onChange={handleCampaignChange}
                  placeholder="مثال: خصومات الجمعة البيضاء"
                  style={{ height: '42px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>موضوع الإيميل (Subject) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  name="subject"
                  required
                  className="form-input"
                  value={campaignForm.subject}
                  onChange={handleCampaignChange}
                  placeholder="لا تفوت خصوماتنا الحصرية!"
                  style={{ height: '42px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>المرسل (Sender) <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  name="sender_id"
                  required
                  className="form-input"
                  value={campaignForm.sender_id}
                  onChange={handleCampaignChange}
                  style={{ height: '42px', padding: '0 0.75rem', boxSizing: 'border-box' }}
                >
                  <option value="">اختر هوية المرسل...</option>
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>{s.nickname} ({s.from?.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>القائمة المستهدفة (List) <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  name="list_id"
                  required
                  className="form-input"
                  value={campaignForm.list_id}
                  onChange={handleCampaignChange}
                  style={{ height: '42px', padding: '0 0.75rem', boxSizing: 'border-box' }}
                >
                  <option value="">اختر القائمة المستهدفة...</option>
                  {lists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>مجموعة الاستبعاد (اختياري)</span>
                  <button type="button" onClick={() => setShowGroupModal(true)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                    <i className="fa-solid fa-plus ml-1" /> إنشاء مجموعة جديدة
                  </button>
                </label>
                <select
                  name="suppression_group_id"
                  className="form-input"
                  value={campaignForm.suppression_group_id}
                  onChange={handleCampaignChange}
                  style={{ height: '42px', padding: '0 0.75rem', boxSizing: 'border-box' }}
                >
                  <option value="">لا يوجد استبعاد</option>
                  {suppressionGroups.map(sg => (
                    <option key={sg.id} value={sg.id}>{sg.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>محتوى الرسالة (HTML) <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                name="html_content"
                required
                className="form-input"
                value={campaignForm.html_content}
                onChange={handleCampaignChange}
                dir="ltr"
                placeholder="<h1>مرحباً بك!</h1><p>هنا محتوى رسالتك...</p>"
                style={{ height: '200px', resize: 'vertical', fontFamily: 'monospace' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 2rem', height: '42px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-paper-plane ml-2" /> إرسال وجدولة الحملة</>}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>إيميل المستلم <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="email"
                  name="to_email"
                  required
                  className="form-input"
                  value={singleForm.to_email}
                  onChange={handleSingleChange}
                  dir="ltr"
                  placeholder="customer@example.com"
                  style={{ height: '42px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم المرسل (اختياري)</label>
                <input
                  type="text"
                  name="from_name"
                  className="form-input"
                  value={singleForm.from_name}
                  onChange={handleSingleChange}
                  placeholder="مثال: الدعم الفني"
                  style={{ height: '42px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>موضوع الإيميل (Subject) <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                name="subject"
                required
                className="form-input"
                value={singleForm.subject}
                onChange={handleSingleChange}
                placeholder="عنوان الرسالة هنا..."
                style={{ height: '42px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>محتوى الرسالة (HTML) <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                name="html_content"
                required
                className="form-input"
                value={singleForm.html_content}
                onChange={handleSingleChange}
                dir="ltr"
                placeholder="<h1>مرحباً بك!</h1><p>هنا محتوى رسالتك...</p>"
                style={{ height: '200px', resize: 'vertical', fontFamily: 'monospace' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 2rem', height: '42px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-paper-plane ml-2" /> إرسال الرسالة فوراً</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Create Suppression Group Modal */}
      {showGroupModal && (
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
              <i className="fa-solid fa-ban" style={{ color: '#ef4444' }} />
              إنشاء مجموعة استبعاد جديدة
            </h3>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم المجموعة</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({...prev, name: e.target.value}))}
                  placeholder="مثال: Unsubscribes"
                  style={{ height: '42px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>الوصف</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({...prev, description: e.target.value}))}
                  placeholder="العملاء الذين طلبوا إلغاء الاشتراك"
                  style={{ height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupModal(false)} style={{ height: '38px', padding: '0 1.5rem' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={creatingGroup} style={{ height: '38px', padding: '0 1.5rem' }}>
                  {creatingGroup ? <i className="fa-solid fa-spinner fa-spin" /> : 'إنشاء وحفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
