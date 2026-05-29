import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { storesApi } from '../api/client'
import Spinner from '../components/ui/Spinner'
import { useNotification } from '../contexts/NotificationContext'

export default function AdminStores() {
  const { user, switchStore } = useAuth()
  const { showNotification } = useNotification()
  const [allStores, setAllStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    console.log("AdminStores page loaded");
  }, [])

  useEffect(() => {
    // Admins will hit GET /stores which returns all stores in the database
    storesApi.list()
      .then((res) => {
        setAllStores(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        showNotification('فشل تحميل قائمة المتاجر.', 'error')
      })
      .finally(() => setLoading(false))
  }, [showNotification])

  const handleDelete = async (storeId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المتجر نهائياً؟ سيتم حذف جميع البيانات التابعة له من سلات وعملاء ورسائل.')) return
    try {
      await storesApi.delete(storeId)
      showNotification('تم حذف المتجر بنجاح.', 'success')
      setAllStores(prev => prev.filter(s => s.id !== storeId))
    } catch (err) {
      showNotification('فشل حذف المتجر.', 'error')
    }
  }

  const filteredStores = allStores.filter(store => 
    (store.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (store.salla_store_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <Spinner center />

  if (!user?.is_admin) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <h3 style={{ color: 'var(--text-danger)' }}>غير مصرح بالدخول</h3>
        <p>هذه الصفحة مخصصة لمدراء المنصة فقط.</p>
      </div>
    )
  }

  return (
    <div className="animate-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>متاجر المنصة العالمية</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            استعرض جميع متاجر سلة المشتركة بالمنصة وتحكم بصلاحياتها وتتبعها.
          </p>
        </div>
        
        {/* Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المتجر أو معرف سلة..."
            style={{
              paddingLeft: '2.5rem',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)'
            }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255, 255, 255, 0.4)'
          }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {filteredStores.map(store => (
          <div
            key={store.id}
            style={{
              background: 'linear-gradient(135deg, rgba(22, 25, 37, 0.7) 0%, rgba(15, 17, 26, 0.8) 100%)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>{store.store_name}</h3>
                <span className={`badge ${store.is_active ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                  {store.is_active ? 'نشط' : 'متوقف'}
                </span>
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <div>
                  <i className="fa-solid fa-user" style={{ marginLeft: '0.5rem', width: '16px' }} />
                  المالك (Owner ID): <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.8rem' }}>{store.owner_id}</span>
                </div>
                <div>
                  <i className="fa-solid fa-store" style={{ marginLeft: '0.5rem', width: '16px' }} />
                  معرف سلة: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{store.salla_store_id || 'غير مربوط'}</span>
                </div>
                <div>
                  <i className="fa-brands fa-whatsapp" style={{ marginLeft: '0.5rem', width: '16px', color: '#10b981' }} />
                  واتساب هاتف: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{store.whatsapp_phone_id || 'غير مربوط'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => switchStore(store.id)} style={{ flex: 1 }}>
                دخول كمسؤول للمتجر
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(store.id)} style={{ padding: '0 0.85rem' }}>
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredStores.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
          لا توجد متاجر تطابق البحث.
        </div>
      )}
    </div>
  )
}
