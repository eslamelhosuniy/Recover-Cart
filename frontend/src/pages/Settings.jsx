import { useState, useEffect } from 'react'
import { settingsApi } from '../api/client'
import Spinner from '../components/ui/Spinner'

export default function Settings() {
  const [formData, setFormData] = useState({
    store_name: '',
    salla_api_key: '',
    whatsapp_phone_id: '',
    whatsapp_access_token: '',
    whatsapp_template_name: 'hello_world',
    automation_enabled: true,
    reminder_delay_hours: 1,
    max_retries: 3,
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

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">اسم المتجر</label>
            <input
              type="text"
              name="store_name"
              className="form-input"
              value={formData.store_name}
              onChange={handleChange}
              required
            />
          </div>
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
            />
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="form-label">مفتاح الربط (Salla API Key)</label>
          <input
            type="password"
            name="salla_api_key"
            className="form-input"
            value={formData.salla_api_key}
            onChange={handleChange}
            required
            dir="ltr"
            placeholder="أدخل الـ Token السري"
          />
        </div>

        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">WhatsApp Access Token</label>
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

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">تأخير الإرسال (بالساعات)</label>
            <input
              type="number"
              name="reminder_delay_hours"
              className="form-input"
              value={formData.reminder_delay_hours}
              onChange={handleChange}
              min="1"
              max="72"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">عدد محاولات إعادة الإرسال</label>
            <input
              type="number"
              name="max_retries"
              className="form-input"
              value={formData.max_retries}
              onChange={handleChange}
              min="0"
              max="5"
              required
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
