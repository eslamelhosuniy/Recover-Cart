import { useState, useEffect } from 'react'
import { settingsApi } from '../api/client'
import Spinner from '../components/ui/Spinner'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user, activeStore } = useAuth()
  const activeStoreId = activeStore?.id || ''
  const origin = window.location.origin
  const sallaWebhookUrl = `${origin}/api/v1/webhooks/salla?store_id=${activeStoreId}`
  const whatsappWebhookUrl = `${origin}/api/v1/webhooks/whatsapp?store_id=${activeStoreId}`

  const [formData, setFormData] = useState({
    salla_webhook_secret: '',
    whatsapp_phone_id: '',
    whatsapp_access_token: '',
    whatsapp_template_name: 'hello_world',
    automation_enabled: true,
    coupon_code: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const { showNotification } = useNotification()


  useEffect(() => {
    settingsApi.get()
      .then((res) => {
        setFormData(res.data)
        setIsNew(false)
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setIsNew(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await settingsApi.create(formData)
        setIsNew(false)
      } else {
        await settingsApi.update(formData)
      }
      showNotification("تم حفظ الإعدادات بنجاح", 'success')
    } catch (err) {
      showNotification(err.response?.data?.detail || 'حدث خطأ أثناء الحفظ.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner center />

  return (
    <div className="animate-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="mb-4">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
          إعدادات النظام والربط
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          قم بتهيئة حساب Meta Developer وسلة للبدء بأتمتة تذكيرات السلات المتروكة.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

          {/* Column 1: API Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Salla Configuration Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-store" />
                إعدادات بوابة متجر سلة
              </h3>

              {/* <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  مفتاح الربط السري (Webhook Token Secret)
                </label>
                <input
                  type="password"
                  name="salla_webhook_secret"
                  className="form-input"
                  value={formData.salla_webhook_secret || ''}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="مفتاح الربط السري الخاص بـ Salla"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  يستخدم للتحقق من مصداقية طلبات الويب هوك المرسلة من سلة.
                </span>
              </div> */}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  رمز الكوبون الافتراضي (Default Coupon Code)
                </label>
                <input
                  type="text"
                  name="coupon_code"
                  className="form-input"
                  value={formData.coupon_code || ''}
                  onChange={handleChange}
                  required
                  placeholder="أدخل رمز الكوبون لإدراجه بالتذكير"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  مثال: SALLA10 (سيتم إرسال هذا الكوبون مع تذكير الواتساب للعميل).
                </span>
              </div>
            </div>

            {/* WhatsApp Configuration Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-brands fa-whatsapp" />
                إعدادات بوابة الواتساب الرسمية
              </h3>

              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  معرف رقم واتساب (Phone Number ID)
                </label>
                <input
                  type="text"
                  name="whatsapp_phone_id"
                  className="form-input"
                  value={formData.whatsapp_phone_id || ''}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  placeholder="مثال: 104829392817293"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  اسم قالب الرسالة المعتمد (Template Name)
                </label>
                <input
                  type="text"
                  name="whatsapp_template_name"
                  className="form-input"
                  value={formData.whatsapp_template_name || ''}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  placeholder="مثال: abandoned_cart_reminder"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  رمز الوصول للواجهة البرمجية (WhatsApp Access Token)
                </label>
                <input
                  type="password"
                  name="whatsapp_access_token"
                  className="form-input"
                  value={formData.whatsapp_access_token || ''}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  placeholder="EAAG..."
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

          </div>

          {/* Column 2: Webhooks & Operational Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Automation Trigger Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>الأتمتة التلقائية</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '4px 0 0 0' }}>
                  إرسال التذكيرات آلياً للعملاء بعد ترك السلة.
                </p>
              </div>
              <div className="toggle-wrap" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  id="automation_enabled"
                  name="automation_enabled"
                  className="toggle-input"
                  checked={formData.automation_enabled}
                  onChange={handleChange}
                />
                <label htmlFor="automation_enabled" className="toggle-label"></label>
              </div>
            </div>

            {/* Webhook URLs Integration Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-link" />
                روابط المزامنة (Webhooks)
              </h3>

              {/* Salla Webhook Info */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  رابط ويبهوك سلة (Salla Webhook URL)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={sallaWebhookUrl}
                    dir="ltr"
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      color: 'var(--text-muted)',
                      height: '36px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      border: '1px solid var(--border)'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ height: '36px', borderRadius: '6px', padding: '0 0.8rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sallaWebhookUrl)
                      showNotification('تم نسخ رابط ويبهوك سلة بنجاح', 'success')
                    }}
                  >
                    <i className="fa-regular fa-copy" />
                    نسخ
                  </button>
                </div>
              </div>

              {/* WhatsApp Webhook Info */}
              <div style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  رابط ويبهوك واتساب (WhatsApp Webhook URL)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={whatsappWebhookUrl}
                    dir="ltr"
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      color: 'var(--text-muted)',
                      height: '36px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      border: '1px solid var(--border)'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ height: '36px', borderRadius: '6px', padding: '0 0.8rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappWebhookUrl)
                      showNotification('تم نسخ رابط ويبهوك واتساب بنجاح', 'success')
                    }}
                  >
                    <i className="fa-regular fa-copy" />
                    نسخ
                  </button>
                </div>
              </div>
            </div>

            {/* Salla Supported Events Status Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-circle-nodes" />
                الأحداث المستمع إليها (Salla Webhook)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div className="d-flex align-center justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="d-flex align-center gap-2">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>تم إنشاء سلة مهجورة</span>
                  </div>
                  <span className="badge badge-muted" dir="ltr" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>abandoned.cart</span>
                </div>

                <div className="d-flex align-center justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="d-flex align-center gap-2">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>تم تحديث سلة مهجورة</span>
                  </div>
                  <span className="badge badge-muted" dir="ltr" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>abandoned.cart.update</span>
                </div>

                <div className="d-flex align-center justify-between" style={{ padding: '0.5rem 0' }}>
                  <div className="d-flex align-center gap-2">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>تم شراء سلة مهجورة</span>
                  </div>
                  <span className="badge badge-muted" dir="ltr" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>abandoned.cart.purchased</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Form Action Controls */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyItems: 'end', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{
              height: '42px',
              padding: '0 2rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-save" />}
            حفظ إعدادات النظام
          </button>
        </div>
      </form>
    </div>
  )
}
