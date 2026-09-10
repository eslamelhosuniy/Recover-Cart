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
  const ghlWebhookUrl = `${origin}/api/v1/webhooks/ghl?store_id=${activeStoreId}`
  const mailgunWebhookUrl = `${origin}/webhooks/mailgun/${activeStoreId}`
  const sendgridWebhookUrl = `${origin}/webhooks/sendgrid/${activeStoreId}`

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
    ghl_automation_enabled: true,
    ghl_instant_reminder_enabled: true,
    ghl_reminder_hours_before: 15,
    ghl_reminder_template_name: 'appointment_reminder',
    ghl_confirmation_template_name: 'appointment_confirmation',
  })
  
  const [emailData, setEmailData] = useState({
    provider: 'mailgun',
    sendgrid_api_key: '',
    sendgrid_default_list_id: '',
    mailgun_api_key: '',
    mailgun_domain: '',
    mailgun_region: 'us',
    mailgun_webhook_signing_key: '',
    mailgun_default_list_address: '',
    mailgun_ip_pool: '',
    from_email: '',
    from_name: '',
    is_active: false,
    validation_delay_hours: 0,
    validate_smtp: false,
    validate_mx: true,
    validate_spelling: true,
    warmup_enabled: false,
    warmup_current_day: 1,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [imageVerifying, setImageVerifying] = useState(false)
  const [imageVerified, setImageVerified] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [dnsStatus, setDnsStatus] = useState(null)
  const [dnsChecking, setDnsChecking] = useState(false)
  const [ipWarmupInfo, setIpWarmupInfo] = useState(null)
  const [ipWarmupLoading, setIpWarmupLoading] = useState(false)
  const [showMailgunApiKey, setShowMailgunApiKey] = useState(false)
  const [showMailgunSigningKey, setShowMailgunSigningKey] = useState(false)
  const [showSendgridApiKey, setShowSendgridApiKey] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState('')
  const { showNotification } = useNotification()

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(label)
    showNotification('تم نسخ الرابط بنجاح', 'success')
    setTimeout(() => setCopiedUrl(''), 3000)
  }

  const handleCheckDomainDNS = async () => {
    if (!activeStoreId) return
    setDnsChecking(true)
    try {
      const res = await emailMarketingApi.getMailgunDomainStatus(activeStoreId)
      setDnsStatus(res.data)
      if (res.data?.is_active) {
        showNotification('النطاق مفعل وجاهز للإرسال بنجاح', 'success')
      } else {
        showNotification('تم فحص سجلات النطاق. يرجى مراجعة حالة السجلات أدناه.', 'info')
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'فشل فحص سجلات النطاق'
      showNotification(msg, 'error')
    } finally {
      setDnsChecking(false)
    }
  }

  const handleCheckIpWarmup = async () => {
    if (!activeStoreId) return
    setIpWarmupLoading(true)
    try {
      const res = await emailMarketingApi.getMailgunIpWarmup(activeStoreId)
      setIpWarmupInfo(res.data)
      showNotification('تم جلب بيانات إحماء الـ IP المخصص', 'success')
    } catch (err) {
      showNotification('تعذر جلب حالة إحماء الـ IP المخصص', 'warning')
    } finally {
      setIpWarmupLoading(false)
    }
  }



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

      // Save email marketing settings
      try {
        await emailMarketingApi.updateSettings(activeStoreId, emailData)
        showNotification("تم حفظ الإعدادات بنجاح", 'success')
      } catch (emailErr) {
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

            {/* GoHighLevel Calendar Automation Card */}
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#6366f1', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-calendar-check" />
                إعدادات أتمتة مواعيد GoHighLevel
              </h3>

              <div className="form-group mb-3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    اسم قالب تأكيد الحجز الفوري (Confirmation Template)
                  </label>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }}>
                    Meta Category: Marketing
                  </span>
                </div>
                <input
                  type="text"
                  name="ghl_confirmation_template_name"
                  className="form-input"
                  value={formData.ghl_confirmation_template_name || ''}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="مثال: appointment_confirmation"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  يُرسل فوراً عند حجز الموعد. المتغيرات المعتمدة في Meta: {'{{1}}'} التاريخ، {'{{2}}'} الوقت.
                </span>
              </div>

              <div className="form-group mb-3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    اسم قالب تذكير الموعد (Reminder Template)
                  </label>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }}>
                    Meta Category: Marketing
                  </span>
                </div>
                <input
                  type="text"
                  name="ghl_reminder_template_name"
                  className="form-input"
                  value={formData.ghl_reminder_template_name || ''}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="مثال: appointment_reminder"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  يُرسل قبل الموعد بـ 15 دقيقة تلقائياً. المتغير المعتمد في Meta: {'{{1}}'} رابط الاجتماع.
                </span>
              </div>

              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  توقيت إرسال التذكير التلقائي قبل الموعد
                </label>
                <select
                  name="ghl_reminder_hours_before"
                  className="form-input"
                  value={formData.ghl_reminder_hours_before ?? 15}
                  onChange={handleChange}
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value={15}>⏱️ قبل الموعد بـ 15 دقيقة (ربع ساعة - متطابق مع قالب تشخيص النمو)</option>
                  <option value={30}>⏱️ قبل الموعد بـ 30 دقيقة (نصف ساعة)</option>
                  <option value={60}>⏱️ قبل الموعد بـ 1 ساعة</option>
                  <option value={120}>⏱️ قبل الموعد بـ ساعتين</option>
                  <option value={1440}>⏱️ قبل الموعد بـ 24 ساعة (يوم كامل)</option>
                </select>
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  يتم إرسال رسالة التذكير آلياً للعميل قبل موعد المكالمة بالمدة المحددة أعلاه.
                </span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>تأكيد الحجز الفوري</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>
                      إرسال رسالة تأكيد واتساب مباشرة عند إتمام العميل للحجز.
                    </div>
                  </div>
                  <div className="toggle-wrap" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      id="ghl_instant_reminder_enabled"
                      name="ghl_instant_reminder_enabled"
                      className="toggle-input"
                      checked={formData.ghl_instant_reminder_enabled}
                      onChange={handleChange}
                    />
                    <label htmlFor="ghl_instant_reminder_enabled" className="toggle-label"></label>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>تفعيل أتمتة مواعيد GoHighLevel</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>
                      تفعيل استقبال حجوزات الكاليندر وجدولة التذكيرات التلقائية.
                    </div>
                  </div>
                  <div className="toggle-wrap" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      id="ghl_automation_enabled"
                      name="ghl_automation_enabled"
                      className="toggle-input"
                      checked={formData.ghl_automation_enabled}
                      onChange={handleChange}
                    />
                    <label htmlFor="ghl_automation_enabled" className="toggle-label"></label>
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
              <div style={{ marginBottom: '1.25rem' }}>
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

              {/* GoHighLevel Webhook Info */}
              <div style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  رابط ويبهوك GoHighLevel (GHL Webhook URL)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={ghlWebhookUrl}
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
                      navigator.clipboard.writeText(ghlWebhookUrl)
                      showNotification('تم نسخ رابط ويبهوك GoHighLevel بنجاح', 'success')
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

            {/* Email Marketing Provider Configuration Card */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0ea5e9', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-envelope" />
                  إعدادات مزود البريد الإلكتروني (Email Provider)
                </h3>
                <span className="badge" style={{ backgroundColor: emailData.provider === 'mailgun' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(14, 165, 233, 0.15)', color: emailData.provider === 'mailgun' ? '#ef4444' : '#0ea5e9', border: `1px solid ${emailData.provider === 'mailgun' ? '#ef4444' : '#0ea5e9'}`, fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '20px' }}>
                  {emailData.provider === 'mailgun' ? 'Mailgun Active' : 'SendGrid Active'}
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setEmailData(prev => ({ ...prev, provider: 'mailgun' }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    backgroundColor: emailData.provider === 'mailgun' ? '#ef4444' : 'transparent',
                    color: emailData.provider === 'mailgun' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  <i className="fa-solid fa-bolt" />
                  Mailgun (الموصى به)
                </button>
                <button
                  type="button"
                  onClick={() => setEmailData(prev => ({ ...prev, provider: 'sendgrid' }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    backgroundColor: emailData.provider === 'sendgrid' ? '#0ea5e9' : 'transparent',
                    color: emailData.provider === 'sendgrid' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  <i className="fa-solid fa-paper-plane" />
                  SendGrid
                </button>
              </div>

              {/* Mailgun Provider Settings */}
              {emailData.provider === 'mailgun' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      مفتاح Mailgun API Key
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showMailgunApiKey ? "text" : "password"}
                        name="mailgun_api_key"
                        className="form-input"
                        value={emailData.mailgun_api_key || ''}
                        onChange={handleChange}
                        dir="ltr"
                        placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx-xxxxxxxx"
                        style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', paddingLeft: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMailgunApiKey(!showMailgunApiKey)}
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <i className={`fa-solid ${showMailgunApiKey ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        نطاق الإرسال (Sending Domain)
                      </label>
                      <input
                        type="text"
                        name="mailgun_domain"
                        className="form-input"
                        value={emailData.mailgun_domain || ''}
                        onChange={handleChange}
                        dir="ltr"
                        placeholder="mail.yourdomain.com"
                        style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        المنطقة (Region)
                      </label>
                      <select
                        name="mailgun_region"
                        className="form-input"
                        value={emailData.mailgun_region || 'us'}
                        onChange={handleChange}
                        style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}
                      >
                        <option value="us">US (api.mailgun.net)</option>
                        <option value="eu">EU (api.eu.mailgun.net)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      مفتاح توقيع الويب هوك (HTTP Webhook Signing Key)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showMailgunSigningKey ? "text" : "password"}
                        name="mailgun_webhook_signing_key"
                        className="form-input"
                        value={emailData.mailgun_webhook_signing_key || ''}
                        onChange={handleChange}
                        dir="ltr"
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', paddingLeft: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMailgunSigningKey(!showMailgunSigningKey)}
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <i className={`fa-solid ${showMailgunSigningKey ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Mailgun Webhook Copy Box */}
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px dashed rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>رابط الـ Webhook الخاص بـ Mailgun في متجرك (قم بوضعه في لوحة تحكم Mailgun):</div>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#ef4444', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} dir="ltr">{mailgunWebhookUrl}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mailgunWebhookUrl, 'mailgun_webhook')}
                      className="btn btn-sm btn-secondary"
                      style={{ flexShrink: 0 }}
                    >
                      <i className={`fa-solid ${copiedUrl === 'mailgun_webhook' ? 'fa-check text-success' : 'fa-copy'}`} />
                      {copiedUrl === 'mailgun_webhook' ? ' تم النسخ' : ' نسخ'}
                    </button>
                  </div>

                  {/* Domain DNS & IP Warmup Tools */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={handleCheckDomainDNS}
                      disabled={dnsChecking || !emailData.mailgun_domain}
                      className="btn btn-sm btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'rgba(239,68,68,0.4)' }}
                    >
                      <i className={`fa-solid fa-shield-halved ${dnsChecking ? 'fa-spin' : ''}`} />
                      {dnsChecking ? 'جارٍ فحص سجلات النطاق...' : 'فحص سجلات DNS وجودة النطاق'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckIpWarmup}
                      disabled={ipWarmupLoading}
                      className="btn btn-sm btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <i className={`fa-solid fa-server ${ipWarmupLoading ? 'fa-spin' : ''}`} />
                      {ipWarmupLoading ? 'جارٍ جلب حالة IP...' : 'فحص إحماء الـ IP المخصص'}
                    </button>
                  </div>

                  {/* DNS Status Results Box */}
                  {dnsStatus && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>حالة النطاق: {dnsStatus.domain}</span>
                        <span className={`badge ${dnsStatus.is_active ? 'badge-success' : 'badge-warning'}`}>
                          {dnsStatus.is_active ? 'نشط ومفعل (Active)' : 'غير مكتمل أو قيد التحقق (Unverified)'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SPF Record</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: dnsStatus.spf_valid ? '#10b981' : '#ef4444' }}>
                            {dnsStatus.spf_valid ? '✓ صالح (Valid)' : '✗ غير مكتمل'}
                          </div>
                        </div>
                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DKIM Record</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: dnsStatus.dkim_valid ? '#10b981' : '#ef4444' }}>
                            {dnsStatus.dkim_valid ? '✓ صالح (Valid)' : '✗ غير مكتمل'}
                          </div>
                        </div>
                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MX Records</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: dnsStatus.mx_valid ? '#10b981' : 'var(--text-muted)' }}>
                            {dnsStatus.mx_valid ? '✓ موجه (Valid)' : 'اختياري للإرسال'}
                          </div>
                        </div>
                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CNAME Tracking</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: dnsStatus.cname_valid ? '#10b981' : 'var(--text-muted)' }}>
                            {dnsStatus.cname_valid ? '✓ صالح (Valid)' : 'تتبع مخصص'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dedicated IP Warmup Results Box */}
                  {ipWarmupInfo && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0ea5e9' }}>
                        بيانات إحماء الـ Dedicated IP (Mailgun)
                      </div>
                      {ipWarmupInfo.has_dedicated_ips ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <p>لديك {ipWarmupInfo.ips_count} عنوان IP مخصص في حسابك.</p>
                          {ipWarmupInfo.ips?.map((ipItem, idx) => (
                            <div key={idx} style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginTop: '0.4rem' }}>
                              <strong>IP:</strong> {ipItem.ip || ipItem.ip_address} | <strong>Warmup:</strong> {ipItem.warmup ? 'مفعل' : 'غير مفعل'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          الحساب يستخدم بركة الـ IP المشتركة عالية السمعة (Shared IP Pool). لا يتطلب إحماء للـ Dedicated IP، وتعمل ميزة إحماء الحملات التصاعدية على مستوى المتجر تلقائياً.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SendGrid Provider Settings */}
              {emailData.provider === 'sendgrid' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(14, 165, 233, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      مفتاح SendGrid API Key
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSendgridApiKey ? "text" : "password"}
                        name="sendgrid_api_key"
                        className="form-input"
                        value={emailData.sendgrid_api_key || ''}
                        onChange={handleChange}
                        dir="ltr"
                        placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                        style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', paddingLeft: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSendgridApiKey(!showSendgridApiKey)}
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <i className={`fa-solid ${showSendgridApiKey ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
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
                      style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}
                    />
                  </div>

                  {/* SendGrid Webhook Copy Box */}
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px dashed rgba(14, 165, 233, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>رابط الـ Webhook الخاص بـ SendGrid في متجرك:</div>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#0ea5e9', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} dir="ltr">{sendgridWebhookUrl}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sendgridWebhookUrl, 'sendgrid_webhook')}
                      className="btn btn-sm btn-secondary"
                      style={{ flexShrink: 0 }}
                    >
                      <i className={`fa-solid ${copiedUrl === 'sendgrid_webhook' ? 'fa-check text-success' : 'fa-copy'}`} />
                      {copiedUrl === 'sendgrid_webhook' ? ' تم النسخ' : ' نسخ'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sender Details (Common) */}
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
                    placeholder="marketing@mail.wedadmarketing.com"
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
                    placeholder="مثال: متجر وداد"
                    style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              {/* Campaign Warmup Engine Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                    <i className="fa-solid fa-fire-flame-curved" style={{ color: '#f59e0b', marginLeft: '0.4rem' }} />
                    تفعيل إحماء الحملات التدريجي (Campaign Warmup Engine)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    إرسال الحملات الكبيرة على دفعات يومية تصاعدية (45، 90، 180، 360...) لبناء سمعة النطاق. اليوم الحالي: {emailData.warmup_current_day || 1}
                  </div>
                </div>
                <div className="toggle-wrap" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    id="warmup_enabled"
                    name="warmup_enabled"
                    className="toggle-input"
                    checked={emailData.warmup_enabled ?? false}
                    onChange={handleChange}
                  />
                  <label htmlFor="warmup_enabled" className="toggle-label"></label>
                </div>
              </div>

              {/* Email Module Toggle */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>تفعيل موديول الإيميل للمتجر</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '4px 0 0 0' }}>
                      تمكين أو تعطيل خواص وحملات الإيميل التسويقية لهذا المتجر.
                    </p>
                  </div>
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


            {/* Email Validation Settings Card */}
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-check-double" />
                إعدادات فحص الإيميلات الآلي
              </h3>

              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  تأخير الفحص (بالساعات)
                </label>
                <input
                  type="number"
                  name="validation_delay_hours"
                  className="form-input"
                  value={emailData.validation_delay_hours ?? 0}
                  onChange={handleChange}
                  min={0}
                  dir="ltr"
                  placeholder="0"
                  style={{ height: '40px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}
                />
                <span className="text-muted text-small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  عدد الساعات التي سيتم انتظارها قبل التحقق من الإيميلات الجديدة. ضع 0 للتحقق الفوري.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>فحص الصياغة الإملائية (Spelling / Syntax)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>يتحقق من صيغة الإيميل والنطاقات المؤقتة.</div>
                  </div>
                  <div className="toggle-wrap" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      id="validate_spelling"
                      name="validate_spelling"
                      className="toggle-input"
                      checked={emailData.validate_spelling ?? true}
                      onChange={handleChange}
                    />
                    <label htmlFor="validate_spelling" className="toggle-label"></label>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>فحص سجلات النطاق (MX Check)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>يتحقق من وجود خادم بريد يستقبل الرسائل.</div>
                  </div>
                  <div className="toggle-wrap" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      id="validate_mx"
                      name="validate_mx"
                      className="toggle-input"
                      checked={emailData.validate_mx ?? true}
                      onChange={handleChange}
                    />
                    <label htmlFor="validate_mx" className="toggle-label"></label>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>فحص صندوق البريد (SMTP Check)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>يتصل بالخادم ليتأكد من وجود البريد (قد يكون أبطأ).</div>
                  </div>
                  <div className="toggle-wrap" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      id="validate_smtp"
                      name="validate_smtp"
                      className="toggle-input"
                      checked={emailData.validate_smtp ?? false}
                      onChange={handleChange}
                    />
                    <label htmlFor="validate_smtp" className="toggle-label"></label>
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
