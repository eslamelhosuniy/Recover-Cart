import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { storesApi } from '../api/client'
import Spinner from '../components/ui/Spinner'
import { useNotification } from '../contexts/NotificationContext'

export default function Stores() {
  const { user, stores, activeStore, switchStore, fetchStores } = useAuth()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState(null)
  
  const [formData, setFormData] = useState({
    store_name: '',
    salla_store_id: '',
    salla_webhook_secret: '',
    whatsapp_phone_id: '',
    whatsapp_access_token: '',
    whatsapp_template_name: 'hello_world',
    coupon_code: '',
    automation_enabled: true,
    reminder_delay_hours: 1,
    max_retries: 3,
    is_active: true
  })

  useEffect(() => {
    console.log("Stores page loaded");
  }, [])

  useEffect(() => {
    fetchStores().finally(() => setLoading(false))
  }, [fetchStores])

  const handleOpenCreate = () => {
    if (!user?.is_admin && stores.length >= 3) {
      showNotification('لقد وصلت إلى الحد الأقصى للمتاجر المسموح بها (3 متاجر).', 'error')
      return
    }
    setEditingStore(null)
    setFormData({
      store_name: '',
      salla_store_id: '',
      salla_webhook_secret: '',
      whatsapp_phone_id: '',
      whatsapp_access_token: '',
      whatsapp_template_name: 'hello_world',
      coupon_code: '',
      automation_enabled: true,
      reminder_delay_hours: 1,
      max_retries: 3,
      is_active: true
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (store) => {
    setEditingStore(store)
    setFormData({
      store_name: store.store_name || '',
      salla_store_id: store.salla_store_id || '',
      salla_webhook_secret: store.salla_webhook_secret || '',
      whatsapp_phone_id: store.whatsapp_phone_id || '',
      whatsapp_access_token: store.whatsapp_access_token || '',
      whatsapp_template_name: store.whatsapp_template_name || 'hello_world',
      coupon_code: store.coupon_code || '',
      automation_enabled: store.automation_enabled !== undefined ? store.automation_enabled : true,
      reminder_delay_hours: store.reminder_delay_hours !== undefined ? store.reminder_delay_hours : 1,
      max_retries: store.max_retries !== undefined ? store.max_retries : 3,
      is_active: store.is_active !== undefined ? store.is_active : true
    })
    setModalOpen(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingStore) {
        await storesApi.update(editingStore.id, formData)
        showNotification('تم تحديث المتجر بنجاح', 'success')
      } else {
        await storesApi.create(formData)
        showNotification('تم إنشاء المتجر بنجاح', 'success')
      }
      setModalOpen(false)
      fetchStores()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'حدث خطأ أثناء حفظ البيانات.', 'error')
    }
  }

  const handleDelete = async (storeId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المتجر؟ سيتم حذف كافة السلات والعملاء والرسائل المرتبطة به.')) return
    try {
      await storesApi.delete(storeId)
      showNotification('تم حذف المتجر بنجاح', 'success')
      fetchStores()
    } catch (err) {
      showNotification('فشل حذف المتجر.', 'error')
    }
  }

  if (loading) return <Spinner center />

  return (
    <>
      <div className="animate-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>إدارة المتاجر</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            أضف وأدر متاجر سلة وقنوات الواتساب الخاصة بك. 
            {!user?.is_admin && <span style={{ color: 'var(--primary-color)' }}> ({stores.length}/3 متاجر مستخدمة)</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-plus" />
          إضافة متجر جديد
        </button>
      </div>

      {/* Stores Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {stores.map((store) => {
          const isActiveContext = activeStore?.id === store.id
          return (
            <div
              key={store.id}
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: isActiveContext ? '2px solid var(--primary-color, #a855f7)' : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: isActiveContext ? '0 8px 32px rgba(168, 85, 247, 0.15)' : '0 8px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>{store.store_name}</h3>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {isActiveContext && (
                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>نشط حالياً</span>
                    )}
                    {store.automation_enabled ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>أتمتة مفعّلة</span>
                    ) : (
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>أتمتة متوقفة</span>
                    )}
                  </div>
                </div>

                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <i className="fa-solid fa-store" style={{ marginLeft: '0.5rem', width: '16px' }} />
                    معرف سلة: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{store.salla_store_id || 'غير مربوط'}</span>
                  </div>
                  <div>
                    <i className="fa-brands fa-whatsapp" style={{ marginLeft: '0.5rem', width: '16px', color: '#10b981' }} />
                    رقم الواتساب: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{store.whatsapp_phone_id || 'غير مربوط'}</span>
                  </div>
                  <div>
                    <i className="fa-solid fa-clock" style={{ marginLeft: '0.5rem', width: '16px' }} />
                    وقت التذكير المجدول: <span style={{ color: '#fff' }}>بعد {store.reminder_delay_hours} ساعة</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                {!isActiveContext && (
                  <button className="btn btn-secondary btn-sm" onClick={() => switchStore(store.id)} style={{ flex: 1 }}>
                    تفعيل المتجر
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(store)} style={{ flex: isActiveContext ? 1 : 'none' }}>
                  تعديل التكوين
                </button>
                {user?.is_admin && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(store.id)} style={{ padding: '0 0.75rem' }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#151722',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '650px',
            padding: '2rem',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1.5rem' }}>
              {editingStore ? 'تعديل إعدادات المتجر' : 'إضافة متجر جديد للربط'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div className="form-group">
                <label className="form-label">اسم المتجر (المراد عرضه في لوحة التحكم)</label>
                <input
                  type="text"
                  name="store_name"
                  required
                  className="form-input"
                  value={formData.store_name}
                  onChange={handleChange}
                  placeholder="أدخل اسم المتجر"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">معرّف متجر سلة (Salla Store ID)</label>
                  <input
                    type="text"
                    name="salla_store_id"
                    className="form-input"
                    value={formData.salla_store_id}
                    onChange={handleChange}
                    placeholder="مثال: 123456789"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">كوبون الخصم الافتراضي</label>
                  <input
                    type="text"
                    name="coupon_code"
                    className="form-input"
                    value={formData.coupon_code}
                    onChange={handleChange}
                    placeholder="مثال: SALLA10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">مفتاح ويبهوك سلة (Salla Webhook Secret)</label>
                <input
                  type="password"
                  name="salla_webhook_secret"
                  className="form-input"
                  value={formData.salla_webhook_secret}
                  onChange={handleChange}
                  placeholder="سر الويبهوك للتحقق من التوقيع"
                />
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: '#10b981', marginBottom: '1rem' }}>
                  <i className="fa-brands fa-whatsapp" style={{ marginLeft: '0.5rem' }} />
                  ربط وتكوين WhatsApp Business
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">معرف رقم هاتف واتساب (Phone ID)</label>
                    <input
                      type="text"
                      name="whatsapp_phone_id"
                      className="form-input"
                      value={formData.whatsapp_phone_id}
                      onChange={handleChange}
                      placeholder="مثال: 1048293928172"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">اسم قالب الرسالة المعتمد</label>
                    <input
                      type="text"
                      name="whatsapp_template_name"
                      className="form-input"
                      value={formData.whatsapp_template_name}
                      onChange={handleChange}
                      placeholder="مثال: abandoned_reminder"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">رمز الوصول لواجهة واتساب (Access Token)</label>
                  <input
                    type="password"
                    name="whatsapp_access_token"
                    className="form-input"
                    value={formData.whatsapp_access_token}
                    onChange={handleChange}
                    placeholder="EAAG..."
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">تأخير التذكير المجدول (بالساعات)</label>
                  <input
                    type="number"
                    name="reminder_delay_hours"
                    min="1"
                    max="24"
                    className="form-input"
                    value={formData.reminder_delay_hours}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الحد الأقصى للمحاولات</label>
                  <input
                    type="number"
                    name="max_retries"
                    min="1"
                    max="5"
                    className="form-input"
                    value={formData.max_retries}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="automation_enabled"
                    checked={formData.automation_enabled}
                    onChange={handleChange}
                  />
                  <span>تفعيل الأتمتة المجدولة للمتجر</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <span>تفعيل هذا المتجر واستقبال البيانات</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ المتجر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
