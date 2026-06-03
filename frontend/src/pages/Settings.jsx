import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { settingsApi, emailMarketingApi } from '../api/client'
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
    whatsapp_webhook_verify_token: '',
    whatsapp_template_name: 'hello_world',
    automation_enabled: true,
    coupon_code: '',
    review_request_enabled: true,
    review_request_template_name: 'review_request',
    review_request_delay_hours: 24,
    reminder_image_url: '',
  })
  
  const [emailData, setEmailData] = useState({
    sendgrid_api_key: '',
    sendgrid_default_list_id: '',
    from_email: '',
    from_name: '',
    is_active: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [imageVerifying, setImageVerifying] = useState(false)
  const [imageVerified, setImageVerified] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const { showNotification } = useNotification()


  useEffect(() => {
    if (!activeStoreId) {
      setLoading(false)
      return
    }

    Promise.allSettled([
      settingsApi.get(activeStoreId),
      emailMarketingApi.getSettings(activeStoreId)
    ]).then(([settingsRes, emailRes]) => {
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data && typeof settingsRes.value.data === 'object') {
        const data = settingsRes.value.data
        setFormData(prev => ({ ...prev, ...data }))
        
        // Auto-verify image if it exists in the database
        if (data.reminder_image_url) {
          setImageVerified(true)
          setImagePreview(data.reminder_image_url)
        }
        
        setIsNew(false)
      } else if (settingsRes.status === 'rejected' && settingsRes.reason.response?.status === 404) {
        setIsNew(true)
      }

      if (emailRes.status === 'fulfilled' && emailRes.value?.data && typeof emailRes.value.data === 'object') {
        setEmailData(prev => ({ ...prev, ...emailRes.value.data }))
      }
    }).finally(() => setLoading(false))
  }, [activeStoreId])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const parsedValue = type === 'checkbox'
      ? checked
      : type === 'number'
        ? value === ''
          ? ''
          : Number(value)
        : value

    const isEmailField = emailData && typeof emailData === 'object' && Object.prototype.hasOwnProperty.call(emailData, name)

    if (isEmailField) {
      setEmailData(prev => ({
        ...prev,
        [name]: parsedValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: parsedValue
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activeStoreId) {
      showNotification('الرجاء اختيار متجر صالح قبل حفظ الإعدادات.', 'error')
      return
    }

    // Validation: if automation is enabled and image URL has text but is not verified
    if (formData.automation_enabled && formData.reminder_image_url?.trim() && !imageVerified) {
      showNotification('يجب التحقق من صورة التذكير قبل الحفظ. انقر على زر "تحقق" أولاً.', 'error')
      setSaving(false)
      return
    }

    setSaving(true)
    try {
      if (isNew) {
        await settingsApi.create(formData)
        setIsNew(false)
      } else {
        await settingsApi.update(activeStoreId, formData)
      }

      // Only attempt to update email settings if email is active
      if (emailData.is_active) {
        try {
          await emailMarketingApi.updateSettings(activeStoreId, emailData)
          showNotification("تم حفظ الإعدادات بنجاح", 'success')
        } catch (emailErr) {
          // Extract error message with proper type checking
          let emailMessage = 'فشل حفظ إعدادات الإيميل.'
          if (emailErr.response?.data) {
            if (typeof emailErr.response.data.detail === 'string') {
              emailMessage = emailErr.response.data.detail
            } else if (typeof emailErr.response.data.message === 'string') {
              emailMessage = emailErr.response.data.message
            }
          } else if (typeof emailErr.message === 'string') {
            emailMessage = emailErr.message
          }
          showNotification(`تم حفظ إعدادات المتجر. ${emailMessage}`, 'warning')
        }
      } else {
        showNotification("تم حفظ الإعدادات بنجاح", 'success')
      }
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.message || err.message || 'حدث خطأ أثناء الحفظ.'
      showNotification(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyImage = async () => {
    const imageUrl = formData.reminder_image_url?.trim()
    
    if (!imageUrl) {
      showNotification('الرجاء إدخال رابط الصورة أولاً', 'error')
      return
    }

    setImageVerifying(true)
    setImageVerified(false)
    setImagePreview('')

    try {
      // Validate URL format
      try {
        new URL(imageUrl)
      } catch {
        showNotification('رابط غير صحيح. تأكد من أن الرابط يبدأ بـ http:// أو https://', 'error')
        setImageVerifying(false)
        return
      }

      // Create an image element to verify the image can be loaded
      const img = new Image()
      let timeoutId

      // Set a timeout for the image load
      timeoutId = setTimeout(() => {
        showNotification('انتهت مهلة الانتظار. تأكد من أن الرابط يشير إلى صورة حقيقية', 'error')
        setImageVerifying(false)
      }, 10000)

      img.onload = () => {
        clearTimeout(timeoutId)
        
        // Check file extension
        const urlPath = imageUrl.toLowerCase()
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
        const hasValidExtension = validExtensions.some(ext => urlPath.includes(ext))

        // Try to determine type from Content-Type header
        fetch(imageUrl, { method: 'HEAD' })
          .then(response => {
            const contentType = response.headers.get('content-type')
            const isValidImageType = contentType && contentType.startsWith('image/')
            
            if (hasValidExtension || isValidImageType) {
              setImageVerified(true)
              setImagePreview(imageUrl)
              showNotification('تم التحقق من الصورة بنجاح', 'success')
            } else {
              showNotification('الملف يجب أن يكون صورة (jpg, jpeg, png, gif, webp, bmp, svg)', 'error')
            }
            setImageVerifying(false)
          })
          .catch(() => {
            // If HEAD request fails, consider it valid if it loaded as image
            if (hasValidExtension) {
              setImageVerified(true)
              setImagePreview(imageUrl)
              showNotification('تم التحقق من الصورة بنجاح', 'success')
            } else {
              showNotification('الملف يجب أن يكون صورة (jpg, jpeg, png, gif, webp, bmp, svg)', 'error')
            }
            setImageVerifying(false)
          })
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        showNotification('لا يمكن تحميل الصورة. تأكد من أن الرابط صحيح وأن الصورة متاحة للوصول', 'error')
        setImageVerifying(false)
      }

      img.src = imageUrl
    } catch (error) {
      showNotification('حدث خطأ أثناء التحقق من الصورة', 'error')
      setImageVerifying(false)
    }
  }

  if (loading) return <Spinner center />

  return (
    <div className="animate-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
              إعدادات النظام والربط
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              قم بتهيئة حساب Meta Developer وسلة للبدء بأتمتة تذكيرات السلات المتروكة.
            </p>
          </div>
          <Link
            to="/documentation"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--accent)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'
            }
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'
            }
          >
            <i className="fa-solid fa-book" />
            التوثيق
          </Link>
        </div>
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
                  رمز الكوبون الافتراضي (Default Coupon Code) <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>- اختياري</span>
                </label>
                <input
                  type="text"
                  name="coupon_code"
                  className="form-input"
                  value={formData.coupon_code || ''}
                  onChange={handleChange}
                  placeholder="أدخل رمز الكوبون لإدراجه بالتذكير"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  مثال: SALLA10 (اتركه فارغاً إذا لم تكن تريد إرسال كوبون).
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
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-brands fa-whatsapp" />
                إعدادات بوابة الواتساب الرسمية
              </h3>

              {/* Sub-border 1: WhatsApp Credentials */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', margin: 0 }}>بيانات الوصول</h4>

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
                    رمز التحقق من ويبهوك الواتساب ( غير مُفعل حالياً )
                  </label>
                  <input
                    type="password"
                    name="whatsapp_webhook_verify_token"
                    className="form-input"
                    value={formData.whatsapp_webhook_verify_token || ''}
                    onChange={handleChange}
                    dir="ltr"
                    placeholder="أدخل رمز التحقق الخاص بواتساب"
                    style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                  />
                  <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                    يستخدم هذا الرمز للتحقق من طلبات الواتساب الواردة إلى النظام.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                   رمز الوصول لرقم الهاتف ( Generated WhatsApp Number Access Token )
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

              {/* Sub-border 2: Cart Reminder Template */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', margin: 0 }}>قالب تذكير السلة المتركة</h4>

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

                <div className="form-group mb-3">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    رابط صورة التذكير (Reminder Image URL) <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>- اختياري</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      name="reminder_image_url"
                      className="form-input"
                      value={formData.reminder_image_url || ''}
                      onChange={(e) => {
                        handleChange(e)
                        // Reset verification when URL changes
                        if (e.target.value !== formData.reminder_image_url) {
                          setImageVerified(false)
                          setImagePreview('')
                        }
                      }}
                      dir="ltr"
                      placeholder="https://example.com/image.jpg"
                      style={{ flex: 1, height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyImage}
                      disabled={imageVerifying}
                      style={{
                        padding: '0 1.2rem',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: imageVerified ? '#10b981' : imageVerifying ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid ' + (imageVerified ? '#059669' : imageVerifying ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.4)'),
                        color: imageVerified ? '#ffffff' : '#10b981',
                        cursor: imageVerifying ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease',
                        opacity: imageVerifying ? 0.8 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        boxShadow: imageVerified ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!imageVerifying) {
                          e.target.style.backgroundColor = imageVerified ? '#059669' : 'rgba(16, 185, 129, 0.35)'
                          e.target.style.boxShadow = imageVerified ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 2px 8px rgba(16, 185, 129, 0.2)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = imageVerified ? '#10b981' : imageVerifying ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.2)'
                        e.target.style.boxShadow = imageVerified ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                    >
                      {imageVerifying ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.85rem' }} />
                          <span>جارٍ</span>
                        </>
                      ) : imageVerified ? (
                        <>
                          <i className="fa-solid fa-check" style={{ fontSize: '0.85rem' }} />
                          <span>تم التحقق</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '0.85rem' }} />
                          <span>تحقق</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                    تنسيقات مدعومة: JPG, JPEG, PNG, GIF, WebP, BMP, SVG. انقر على "تحقق" للتحقق من أن الرابط يشير إلى صورة حقيقية.
                  </span>
                </div>

                {imagePreview && (
                  <div
                    style={{
                      border: '2px solid rgba(16, 185, 129, 0.5)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                      <i className="fa-solid fa-image" style={{ marginRight: '0.5rem' }} />
                      معاينة الصورة
                    </div>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '150px',
                        borderRadius: '4px',
                        objectFit: 'contain',
                        backgroundColor: 'rgba(0,0,0,0.2)'
                      }}
                    />
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>تفعيل أتمتة تذكير السلة الفارغة</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>
                        إرسال التذكيرات عبر واتساب عند ترك السلة.
                      </div>
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
                </div>
              </div>

              {/* Sub-border 3: Review Request Settings */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6', margin: 0 }}>إعدادات طلبات التقييمات</h4>

                <div className="form-group mb-3">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    اسم قالب طلب التقييم (Review Template Name)
                  </label>
                  <input
                    type="text"
                    name="review_request_template_name"
                    className="form-input"
                    value={formData.review_request_template_name || ''}
                    onChange={handleChange}
                    dir="ltr"
                    placeholder="مثال: review_request"
                    style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                  />
                  <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                    اسم قالب الواتساب المستخدم لإرسال طلبات التقييم.
                  </span>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    تأخير الإرسال (ساعات) (Delay Hours)
                  </label>
                  <input
                    type="number"
                    name="review_request_delay_hours"
                    className="form-input"
                    value={formData.review_request_delay_hours || ''}
                    onChange={handleChange}
                    min={1}
                    required
                    dir="ltr"
                    placeholder="مثال: 24"
                    style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                  />
                  <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                    عدد الساعات المراد الانتظار قبل إرسال طلب التقييم بعد استرجاع السلة.
                  </span>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>تفعيل طلبات التقييمات</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>
                        إرسال طلبات التقييم للعملاء بعد استرجاع السلة.
                      </div>
                    </div>
                    <div className="toggle-wrap" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        id="review_request_enabled"
                        name="review_request_enabled"
                        className="toggle-input"
                        checked={formData.review_request_enabled}
                        onChange={handleChange}
                      />
                      <label htmlFor="review_request_enabled" className="toggle-label"></label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2: Webhooks & Operational Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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

            {/* SendGrid Configuration Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0ea5e9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-envelope" />
                إعدادات التسويق عبر الإيميل (SendGrid)
              </h3>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  مفتاح واجهة برمجة التطبيقات (API Key)
                </label>
                <input
                  type="password"
                  name="sendgrid_api_key"
                  className="form-input"
                  value={emailData.sendgrid_api_key || ''}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    إيميل المرسل (From Email)
                  </label>
                  <input
                    type="email"
                    name="from_email"
                    className="form-input"
                    value={emailData.from_email || ''}
                    onChange={handleChange}
                    dir="ltr"
                    placeholder="marketing@yourdomain.com"
                    style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    اسم المرسل (From Name)
                  </label>
                  <input
                    type="text"
                    name="from_name"
                    className="form-input"
                    value={emailData.from_name || ''}
                    onChange={handleChange}
                    placeholder="مثال: متجر الهدايا"
                    style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  معرف القائمة الافتراضية (Default List ID)
                </label>
                <input
                  type="text"
                  name="sendgrid_default_list_id"
                  className="form-input"
                  value={emailData.sendgrid_default_list_id || ''}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="مثال: 11a22b33c-44d5"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>تفعيل موديول الإيميل</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '4px 0 0 0' }}>
                      تفعيل أو تعطيل خواص الإيميل لهذا المتجر.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>تفعيل الإيميل</span>
                    <div className="toggle-wrap" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        className="toggle-input"
                        checked={emailData.is_active}
                        onChange={handleChange}
                      />
                      <label htmlFor="is_active" className="toggle-label"></label>
                    </div>
                  </div>
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
