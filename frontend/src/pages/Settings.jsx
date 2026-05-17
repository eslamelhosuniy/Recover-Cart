import { useState, useEffect } from 'react'
import { settingsApi } from '../api/client'
import Spinner from '../components/ui/Spinner'

export default function Settings() {
  const [formData, setFormData] = useState({
    salla_api_key: '',
    whatsapp_phone_id: '',
    whatsapp_access_token: '',
    whatsapp_template_name: 'hello_world',
    automation_enabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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
    setMessage({ type: '', text: '' })

    try {
      if (isNew) {
        await settingsApi.create(formData)
        setIsNew(false)
      } else {
        await settingsApi.update(formData)
      }
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'حدث خطأ أثناء الحفظ.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner center />

  return (
    <div className="card animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">إعدادات النظام</h2>
      </div>

      {message.text && (
        <div className={`mb-3 p-3 rounded d-flex align-center gap-2 ${message.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`} style={{ borderRadius: '8px' }}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`} />
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: General & Salla Settings */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <i className="fa-solid fa-sliders" />
            الإعدادات العامة وإعدادات سلة
          </h3>

          <div className="form-group mb-4">
            <label className="form-label">تمكين الأتمتة</label>
            <div className="toggle-wrap">
              <input
                type="checkbox"
                id="automation_enabled"
                name="automation_enabled"
                className="toggle-input"
                checked={formData.automation_enabled}
                onChange={handleChange}
              />
              <label htmlFor="automation_enabled" className="toggle-label"></label>
              <span className="text-muted text-small">
                عند التفعيل، سيقوم النظام بإرسال التذكيرات تلقائياً
              </span>
            </div>
          </div>

          <div className="form-group mb-3">
            <label className="form-label">مفتاح الربط (Salla Webhook Token Key)</label>
            <input
              type="password"
              name="salla_api_key"
              className="form-input"
              value={formData.salla_api_key}
              onChange={handleChange}
              required
              dir="ltr"
              placeholder="أدخل الـ Token السري الخاص بـ Salla"
            />
          </div>
        </div>

        {/* Section 2: WhatsApp Gateway Settings */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <i className="fa-brands fa-whatsapp" />
            إعدادات بوابة واتساب (WhatsApp Business API)
          </h3>

          <div className="form-row mb-3">
            <div className="form-group">
              <label className="form-label">معرف رقم واتساب (Phone ID)</label>
              <input
                type="text"
                name="whatsapp_phone_id"
                className="form-input"
                value={formData.whatsapp_phone_id}
                onChange={handleChange}
                required
                dir="ltr"
                placeholder="أدخل معرف الرقم (Phone Number ID)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">اسم قالب واتساب (Template Name)</label>
              <input
                type="text"
                name="whatsapp_template_name"
                className="form-input"
                value={formData.whatsapp_template_name}
                onChange={handleChange}
                required
                dir="ltr"
                placeholder="مثال: hello_world"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">رمز الوصول لواتساب (WhatsApp Access Token)</label>
            <input
              type="password"
              name="whatsapp_access_token"
              className="form-input"
              value={formData.whatsapp_access_token}
              onChange={handleChange}
              required
              dir="ltr"
              placeholder="EAA..."
            />
          </div>
        </div>

        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-save" />}
            حفظ التغييرات
          </button>
        </div>
      </form>
    </div>
  )
}
