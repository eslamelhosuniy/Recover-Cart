import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { emailMarketingApi } from '../api/client'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'

export default function EmailCampaigns() {
  const { activeStore } = useAuth()
  const activeStoreId = activeStore?.id || ''
  const { showNotification } = useNotification()

  // Main State
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dropdown states
  const [lists, setLists] = useState([])
  const [senders, setSenders] = useState([])
  const [suppressionGroups, setSuppressionGroups] = useState([])
  const [designs, setDesigns] = useState([])
  
  const [stats, setStats] = useState({})
  const [globalStats, setGlobalStats] = useState({ opens: 0, clicks: 0, delivered: 0, bounces: 0 })

  // Modal states
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState(null)
  const [showSingleModal, setShowSingleModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showChildrenModal, setShowChildrenModal] = useState(false)
  const [childrenCampaigns, setChildrenCampaigns] = useState([])
  const [campaignRunLogs, setCampaignRunLogs] = useState({})
  const [selectedDesignId, setSelectedDesignId] = useState('')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedStats, setSelectedStats] = useState(null)
  
  const [actionLoading, setActionLoading] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', description: '', is_default: false })
  const [campaignForm, setCampaignForm] = useState({
    name: '', subject: '', html_content: '', sender_id: '', list_id: '', suppression_group_id: '', custom_unsubscribe_url: '', is_warmup: false
  })
  const [singleForm, setSingleForm] = useState({
    to_email: '', subject: '', html_content: '', from_name: ''
  })

  const fetchData = useCallback(async () => {
    if (!activeStoreId) return
    setLoading(true)
    try {
      const [campsRes, listsRes, sendersRes, suppRes, designsRes, statsRes] = await Promise.all([
        emailMarketingApi.getCampaigns(activeStoreId).catch(() => ({ data: [] })),
        emailMarketingApi.getLists(activeStoreId).catch(() => ({ data: { result: [] }})),
        emailMarketingApi.getSenders(activeStoreId).catch(() => ({ data: [] })),
        emailMarketingApi.getSuppressionGroups(activeStoreId).catch(() => ({ data: [] })),
        emailMarketingApi.getDesigns(activeStoreId).catch(() => ({ data: [] })),
        emailMarketingApi.getCampaignsStats(activeStoreId).catch(() => ({ data: { results: [] } }))
      ])

      setCampaigns(Array.isArray(campsRes.data) ? campsRes.data : [])
      setLists(listsRes.data.result || (Array.isArray(listsRes.data) ? listsRes.data : []))
      
      const sData = sendersRes.data
      setSenders(Array.isArray(sData) ? sData : (sData.result || []))
      
      const supData = suppRes.data
      setSuppressionGroups(Array.isArray(supData) ? supData : (supData.suppression_groups || []))
      
      setDesigns(Array.isArray(designsRes.data) ? designsRes.data : [])
      
      const fetchedStats = statsRes.data?.results || []
      const statsMap = {}
      let tOpens = 0, tClicks = 0, tDelivered = 0, tBounces = 0
      fetchedStats.forEach(s => {
        if(s.id) {
           statsMap[s.id] = s.stats || {}
           tOpens += (s.stats?.unique_opens || s.stats?.opens || 0)
           tClicks += (s.stats?.unique_clicks || s.stats?.clicks || 0)
           tDelivered += (s.stats?.delivered || 0)
           tBounces += (s.stats?.bounces || 0)
        }
      })
      setStats(statsMap)
      setGlobalStats({ opens: tOpens, clicks: tClicks, delivered: tDelivered, bounces: tBounces })

    } catch (err) {
      console.error("Failed to fetch data", err)
    } finally {
      setLoading(false)
    }
  }, [activeStoreId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroup.name.trim() || !newGroup.description.trim()) return
    setCreatingGroup(true)
    try {
      await emailMarketingApi.createSuppressionGroup(activeStoreId, newGroup)
      showNotification("تم إنشاء مجموعة الاستبعاد بنجاح", "success")
      setShowGroupModal(false)
      setNewGroup({ name: '', description: '', is_default: false })
      fetchData() // Refresh
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
    setActionLoading(true)
    try {
      const payload = {
        ...campaignForm,
        sender_id: parseInt(campaignForm.sender_id),
        suppression_group_id: campaignForm.suppression_group_id ? parseInt(campaignForm.suppression_group_id) : null
      }
      const res = await emailMarketingApi.createCampaign(activeStoreId, payload)
      
      if (res.data.campaign_id) {
        await emailMarketingApi.sendCampaign(activeStoreId, res.data.campaign_id)
        showNotification(payload.is_warmup ? "تم إنشاء وتقسيم وجدولة حملات الإحماء بنجاح" : "تم إنشاء وجدولة الحملة بنجاح", "success")
      } else {
        showNotification("تم إنشاء الحملة", "success")
      }
      
      setCampaignForm({ name: '', subject: '', html_content: '', sender_id: '', list_id: '', suppression_group_id: '', custom_unsubscribe_url: '', is_warmup: false })
      setShowCampaignModal(false)
      setSelectedDesignId('')
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إنشاء الحملة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = {
        name: campaignForm.name,
        subject: campaignForm.subject,
        html_content: campaignForm.html_content,
        sender_id: campaignForm.sender_id ? parseInt(campaignForm.sender_id) : undefined,
        list_id: campaignForm.list_id,
        suppression_group_id: campaignForm.suppression_group_id ? parseInt(campaignForm.suppression_group_id) : null,
        is_warmup: campaignForm.is_warmup
      }
      await emailMarketingApi.updateCampaign(activeStoreId, editingCampaignId, payload)
      showNotification("تم تعديل الحملة بنجاح", "success")
      setCampaignForm({ name: '', subject: '', html_content: '', sender_id: '', list_id: '', suppression_group_id: '', custom_unsubscribe_url: '', is_warmup: false })
      setShowEditModal(false)
      setSelectedDesignId('')
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل تعديل الحملة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const activateCampaign = async (campaignId) => {
    setActionLoading(true)
    try {
      await emailMarketingApi.sendCampaign(activeStoreId, campaignId)
      showNotification("تم تفعيل وجدولة الحملة بنجاح", "success")
      fetchData()
    } catch(err) {
      showNotification(err.response?.data?.detail || "فشل تفعيل الحملة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const runLiveCampaign = async (campaign) => {
    const isWarmupFrozen = Boolean(campaign?.is_warmup || campaign?.status === 'warming_up' || campaign?.parent_id)
    if (isWarmupFrozen) {
      showNotification("لا يمكن تشغيل هذه الحملة مباشرة بينما هي في وضع الإحماء/التجميد", "warning")
      return
    }

    setActionLoading(true)
    try {
      await emailMarketingApi.runLiveCampaign(activeStoreId, campaign.id)
      showNotification("تم تشغيل الحملة مباشرة بنجاح", "success")
      fetchData()
    } catch(err) {
      showNotification(err.response?.data?.detail || "فشل تشغيل الحملة مباشرة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const fetchCampaignRunLogs = async (campaignId) => {
    if (!campaignId || campaignRunLogs[campaignId]) return
    try {
      const res = await emailMarketingApi.getCampaignRunLogs?.(activeStoreId, campaignId)
      if (res?.data) {
        setCampaignRunLogs(prev => ({ ...prev, [campaignId]: Array.isArray(res.data) ? res.data : [] }))
      }
    } catch (err) {
      console.error('Failed to fetch campaign run logs', err)
    }
  }

  const viewChildCampaigns = async (campaignId) => {
    setActionLoading(true)
    try {
      const res = await emailMarketingApi.getChildCampaigns(activeStoreId, campaignId)
      setChildrenCampaigns(res.data || [])
      setShowChildrenModal(true)
    } catch(err) {
      showNotification("فشل جلب الحملات الفرعية", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const viewStats = (sgCampaignId) => {
    if (!sgCampaignId) {
      showNotification("هذه الحملة لم تدمج مع SendGrid بعد", "warning");
      return;
    }
    const cStats = stats[sgCampaignId] || { opens: 0, clicks: 0, delivered: 0, bounces: 0 };
    setSelectedStats(cStats);
    setShowStatsModal(true);
  }

  const openEditModal = (campaign) => {
    setCampaignForm({
      name: campaign.name || '',
      subject: campaign.subject || '',
      html_content: campaign.html_content || '',
      sender_id: campaign.sender_id || '',
      list_id: campaign.list_id || '',
      suppression_group_id: campaign.suppression_group_id || '',
      custom_unsubscribe_url: campaign.custom_unsubscribe_url || '',
      is_warmup: campaign.is_warmup || false
    })
    setEditingCampaignId(campaign.id)
    setSelectedDesignId('')
    setShowEditModal(true)
  }

  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await emailMarketingApi.sendSingleEmail(activeStoreId, singleForm)
      showNotification("تمت إضافة الرسالة لطابور الإرسال بنجاح", "success")
      setSingleForm({ to_email: '', subject: '', html_content: '', from_name: '' })
      setShowSingleModal(false)
    } catch (err) {
      showNotification(err.response?.data?.detail || "فشل إرسال الرسالة", "error")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '2rem' }}>
      <div className="d-flex justify-between align-center mb-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
            الحملات الإعلانية
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            استعرض حملاتك التسويقية السابقة أو أنشئ رسائل جديدة.
          </p>
        </div>
        <div className="d-flex gap-2">
          
          <button className="btn btn-secondary" onClick={async () => {
            setActionLoading(true)
            try {
              await emailMarketingApi.syncSendgridData(activeStoreId)
              showNotification("تمت مزامنة البيانات بنجاح", "success")
              fetchData()
            } catch(e) {
              showNotification("فشل المزامنة", "error")
            } finally {
              setActionLoading(false)
            }
          }} disabled={actionLoading}>
            <i className={`fa-solid fa-rotate ${actionLoading ? 'fa-spin' : ''}`} /> مزامنة SendGrid
          </button>

          <button className="btn btn-secondary" onClick={() => setShowSingleModal(true)}>
            <i className="fa-solid fa-paper-plane" /> إرسال رسالة فردية
          </button>
          <button className="btn btn-primary" onClick={() => setShowCampaignModal(true)}>
            <i className="fa-solid fa-bullhorn" /> إضافة حملة جديدة
          </button>
        </div>
      </div>

      {/* Global Stats Summary */}
      <div className="d-flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        {[
          { label: 'تم التوصيل', value: globalStats.delivered, icon: 'fa-paper-plane', color: 'var(--primary)' },
          { label: 'الفتوحات', value: globalStats.opens, icon: 'fa-envelope-open', color: '#10b981' },
          { label: 'النقرات', value: globalStats.clicks, icon: 'fa-hand-pointer', color: '#f59e0b' },
          { label: 'المرتجعة', value: globalStats.bounces, icon: 'fa-circle-exclamation', color: '#ef4444' }
        ].map((s, i) => (
          <div key={i} className="card d-flex align-center gap-3 p-3" style={{ flex: '1 1 200px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
               <i className={`fa-solid ${s.icon}`}></i>
             </div>
             <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.label}</div>
               <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{s.value}</div>
             </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '3rem 0' }}><Spinner center /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '3rem 0' }}>
            <i className="fa-solid fa-bullhorn mb-2" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
            <p>لا توجد حملات مسجلة بعد.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>اسم الحملة</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>العنوان (Subject)</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>الحالة</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>رقم SendGrid</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>تاريخ الإنشاء</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.subject}</td>
                    <td style={{ padding: '1rem' }}>
                      {c.status === 'draft' && <span className="badge badge-secondary">مسودة</span>}
                      {c.status === 'scheduled' && <span className="badge badge-primary">مجدولة</span>}
                      {c.status === 'warming_up' && <span className="badge badge-warning">قيد الإحماء</span>}
                      {c.status === 'sent' && <span className="badge badge-success">مرسلة</span>}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', dir: 'ltr', textAlign: 'left' }}>{c.sendgrid_campaign_id || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', dir: 'ltr', textAlign: 'left' }}>
                      {new Date(c.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="d-flex gap-2 flex-wrap">
                        {(c.status === 'draft' || c.status === 'scheduled') && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => c.is_warmup || c.status === 'warming_up' || c.parent_id ? showNotification('لا يمكن تشغيل هذه الحملة مباشرة بينما هي في وضع الإحماء/التجميد', 'warning') : runLiveCampaign(c)}
                            disabled={actionLoading}
                            style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'transparent' }}
                          >
                            <i className="fa-solid fa-play" /> تشغيل
                          </button>
                        )}

                        {c.is_warmup ? (
                          <button className="btn btn-sm btn-secondary" onClick={() => viewChildCampaigns(c.id)}>
                            <i className="fa-solid fa-list-ol"></i> الدفعات (الإحماء)
                          </button>
                        ) : (
                          c.status === 'draft' ? (
                            <>
                              <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(c)}>تعديل</button>
                              <button className="btn btn-sm btn-success" onClick={() => activateCampaign(c.id)}>تفعيل</button>
                            </>
                          ) : (
                            <button className="btn btn-sm btn-secondary" onClick={() => viewStats(c.sendgrid_campaign_id)}>
                              <i className="fa-solid fa-chart-line"></i> الإحصائيات
                            </button>
                          )
                        )}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div>الوقت القادم: {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                        <div
                          onMouseEnter={() => fetchCampaignRunLogs(c.id)}
                          style={{ marginTop: '0.25rem', color: 'var(--primary)', cursor: 'pointer' }}
                        >
                          <i className="fa-solid fa-history" /> آخر تشغيل: {campaignRunLogs[c.id]?.[0]?.triggered_at ? new Date(campaignRunLogs[c.id][0].triggered_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'لا يوجد سجل بعد'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', padding: '3rem 1rem', overflowY: 'auto', zIndex: 99999999 }} onClick={() => setShowCampaignModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '95%', maxWidth: '800px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-bullhorn text-primary" /> إنشاء حملة تسويقية
            </h3>
            <form onSubmit={handleCampaignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم الحملة <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="name" required className="form-input" value={campaignForm.name} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>موضوع الإيميل <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="subject" required className="form-input" value={campaignForm.subject} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>المرسل <span style={{ color: '#ef4444' }}>*</span></label>
                  <select name="sender_id" required className="form-input" value={campaignForm.sender_id} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">اختر المرسل...</option>
                    {senders.map(s => <option key={s.id} value={s.id}>{s.nickname}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>القائمة <span style={{ color: '#ef4444' }}>*</span></label>
                  <select name="list_id" required className="form-input" value={campaignForm.list_id} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">اختر القائمة...</option>
                    {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>استبعاد (اختياري)</span>
                    <button type="button" onClick={() => setShowGroupModal(true)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>إضافة</button>
                  </label>
                  <select name="suppression_group_id" className="form-input" value={campaignForm.suppression_group_id} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">لا يوجد استبعاد</option>
                    {suppressionGroups.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>محتوى الرسالة (HTML) <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea name="html_content" required className="form-input" value={campaignForm.html_content} onChange={handleCampaignChange} dir="ltr" style={{ height: '200px', padding: '0.75rem', resize: 'vertical', fontFamily: 'monospace' }}></textarea>
                </div>
                <div className="form-group" style={{ marginBottom: 0, width: '250px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>استيراد تصميم جاهز (SendGrid)</label>
                  <select className="form-input" value={selectedDesignId} onChange={async (e) => {
                    const dId = e.target.value;
                    setSelectedDesignId(dId);
                    if (dId) {
                      setActionLoading(true);
                      try {
                        const res = await emailMarketingApi.getDesign(activeStoreId, dId);
                        setCampaignForm(prev => ({...prev, html_content: res.data.html_content || ''}));
                        showNotification("تم استيراد التصميم بنجاح", "success");
                      } catch(err) {
                        showNotification("فشل استيراد التصميم", "error");
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">اختر تصميماً...</option>
                    {designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group mb-0" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                <input type="checkbox" id="is_warmup_check" checked={campaignForm.is_warmup} onChange={(e) => setCampaignForm(p => ({...p, is_warmup: e.target.checked}))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="is_warmup_check" style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, cursor: 'pointer', color: 'var(--text)' }}>
                  تفعيل الإحماء (Warmup): سيقوم النظام تلقائياً بتقسيم القائمة لدفعات وجدولتها لتجنب الحظر.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCampaignModal(false)} style={{ padding: '0 1.5rem', height: '42px' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ padding: '0 2rem', height: '42px' }}>
                  {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'إرسال وجدولة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Edit Campaign Modal */}
      {showEditModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', padding: '3rem 1rem', overflowY: 'auto', zIndex: 99999999 }} onClick={() => setShowEditModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '95%', maxWidth: '800px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-pen text-primary" /> تعديل الحملة
            </h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم الحملة</label>
                  <input type="text" name="name" className="form-input" value={campaignForm.name} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>موضوع الإيميل</label>
                  <input type="text" name="subject" className="form-input" value={campaignForm.subject} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>المرسل</label>
                  <select name="sender_id" className="form-input" value={campaignForm.sender_id} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">اختر المرسل...</option>
                    {senders.map(s => <option key={s.id} value={s.id}>{s.nickname}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>القائمة</label>
                  <select name="list_id" className="form-input" value={campaignForm.list_id} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">اختر القائمة...</option>
                    {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>استبعاد (اختياري)</span>
                  </label>
                  <select name="suppression_group_id" className="form-input" value={campaignForm.suppression_group_id} onChange={handleCampaignChange} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">لا يوجد استبعاد</option>
                    {suppressionGroups.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>محتوى الرسالة (HTML)</label>
                  <textarea name="html_content" className="form-input" value={campaignForm.html_content} onChange={handleCampaignChange} dir="ltr" style={{ height: '200px', padding: '0.75rem', resize: 'vertical', fontFamily: 'monospace' }}></textarea>
                </div>
                <div className="form-group" style={{ marginBottom: 0, width: '250px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>استيراد تصميم جاهز (SendGrid)</label>
                  <select className="form-input" value={selectedDesignId} onChange={async (e) => {
                    const dId = e.target.value;
                    setSelectedDesignId(dId);
                    if (dId) {
                      setActionLoading(true);
                      try {
                        const res = await emailMarketingApi.getDesign(activeStoreId, dId);
                        setCampaignForm(prev => ({...prev, html_content: res.data.html_content || ''}));
                        showNotification("تم استيراد التصميم بنجاح", "success");
                      } catch(err) {
                        showNotification("فشل استيراد التصميم", "error");
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }} style={{ height: '42px', padding: '0 0.75rem' }}>
                    <option value="">اختر تصميماً...</option>
                    {designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group mb-0" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                <input type="checkbox" id="edit_is_warmup_check" checked={campaignForm.is_warmup} onChange={(e) => setCampaignForm(p => ({...p, is_warmup: e.target.checked}))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="edit_is_warmup_check" style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, cursor: 'pointer', color: 'var(--text)' }}>
                  تفعيل الإحماء (Warmup): سيقوم النظام تلقائياً بتقسيم القائمة لدفعات وجدولتها لتجنب الحظر.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} style={{ padding: '0 1.5rem', height: '42px' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ padding: '0 2rem', height: '42px' }}>
                  {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Single Message Modal */}
      {showSingleModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', padding: '3rem 1rem', overflowY: 'auto', zIndex: 99999999 }} onClick={() => setShowSingleModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '90%', maxWidth: '600px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-paper-plane text-primary" /> إرسال رسالة فردية
            </h3>
            <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>إيميل المستلم <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="email" name="to_email" required className="form-input" value={singleForm.to_email} onChange={handleSingleChange} dir="ltr" style={{ height: '42px', padding: '0 0.75rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>اسم المرسل (اختياري)</label>
                  <input type="text" name="from_name" className="form-input" value={singleForm.from_name} onChange={handleSingleChange} style={{ height: '42px', padding: '0 0.75rem' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>الموضوع <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" name="subject" required className="form-input" value={singleForm.subject} onChange={handleSingleChange} style={{ height: '42px', padding: '0 0.75rem' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>محتوى الرسالة (HTML) <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea name="html_content" required className="form-input" value={singleForm.html_content} onChange={handleSingleChange} dir="ltr" style={{ height: '200px', padding: '0.75rem', resize: 'vertical', fontFamily: 'monospace' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSingleModal(false)} style={{ padding: '0 1.5rem', height: '42px' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ padding: '0 2rem', height: '42px' }}>
                  {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'إرسال فوراً'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {showGroupModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999999, display: 'flex', padding: '3rem 1rem', overflowY: 'auto' }} onClick={() => setShowGroupModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '90%', maxWidth: '400px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>إنشاء مجموعة استبعاد</h3>
            <form onSubmit={handleCreateGroup}>
              <input type="text" required placeholder="اسم المجموعة" className="form-input mb-3" value={newGroup.name} onChange={(e) => setNewGroup({...newGroup, name: e.target.value})} style={{ height: '42px', padding: '0 0.75rem' }} />
              <input type="text" required placeholder="الوصف" className="form-input mb-4" value={newGroup.description} onChange={(e) => setNewGroup({...newGroup, description: e.target.value})} style={{ height: '42px', padding: '0 0.75rem' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupModal(false)} style={{ height: '38px', padding: '0 1.5rem' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={creatingGroup} style={{ height: '38px', padding: '0 1.5rem' }}>إنشاء</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Children Campaigns Modal */}
      {showChildrenModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999999, display: 'flex', padding: '3rem 1rem', overflowY: 'auto' }} onClick={() => setShowChildrenModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '95%', maxWidth: '800px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center mb-4">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-list-ol text-primary" /> الدفعات المجدولة (الإحماء)
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowChildrenModal(false)}>إغلاق</button>
            </div>
            {childrenCampaigns.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '2rem 0' }}>لا توجد حملات فرعية مسجلة.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>الدفعة (اليوم)</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>الاسم</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>الحالة</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600 }}>وقت الإرسال المجدول</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childrenCampaigns.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>اليوم {c.warmup_day}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge badge-primary">{c.status}</span>
                        </td>
                        <td style={{ padding: '0.75rem', dir: 'ltr', textAlign: 'left' }}>
                          {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'فوراً'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      , document.body)}

      {/* Stats Modal */}
      {showStatsModal && selectedStats && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999999, display: 'flex', padding: '3rem 1rem', overflowY: 'auto' }} onClick={() => setShowStatsModal(false)}>
          <div className="card animate-in" style={{ padding: '2rem', width: '90%', maxWidth: '500px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center mb-4">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-chart-line text-primary" /> إحصائيات الحملة
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStatsModal(false)}>إغلاق</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="d-flex justify-between align-center" style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>تم التوصيل (Delivered)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedStats.delivered || 0}</span>
              </div>
              <div className="d-flex justify-between align-center" style={{ padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>الفتوحات (Opens)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedStats.unique_opens || selectedStats.opens || 0}</span>
              </div>
              <div className="d-flex justify-between align-center" style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>النقرات (Clicks)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedStats.unique_clicks || selectedStats.clicks || 0}</span>
              </div>
              <div className="d-flex justify-between align-center" style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>المرتجعة (Bounces)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedStats.bounces || 0}</span>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
