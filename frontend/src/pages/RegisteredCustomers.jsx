import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/client'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import KPICard from '../components/ui/KPICard'

export default function RegisteredCustomers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal States
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null) // null = creating, object = editing
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false,
    is_active: true,
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete States
  const [deleteUserId, setDeleteUserId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // 1. Guard route: If the logged-in user is not an admin, redirect to Dashboard
  if (!user || !user.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authApi.users()
      setUsers(res.data)
    } catch (err) {
      console.error('Error fetching registered users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleOpenModal = (u = null) => {
    setErrorMsg('')
    if (u) {
      setEditingUser(u)
      setFormData({
        username: u.username || '',
        email: u.email || '',
        password: '', // Blank to keep password unchanged
        is_admin: u.is_admin || false,
        is_active: u.is_active !== undefined ? u.is_active : true,
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        email: '',
        password: '',
        is_admin: false,
        is_active: true,
      })
    }
    setModalOpen(true)
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      if (editingUser) {
        // Edit User
        const payload = {
          username: formData.username,
          email: formData.email || null,
          is_admin: formData.is_admin,
          is_active: formData.is_active,
        }
        if (formData.password) {
          payload.password = formData.password
        }
        await authApi.updateUser(editingUser.id, payload)
      } else {
        // Create User
        if (!formData.password) {
          setErrorMsg('كلمة المرور مطلوبة لإنشاء حساب جديد.')
          setSaving(false)
          return
        }
        const payload = {
          username: formData.username,
          email: formData.email || null,
          password: formData.password,
          is_admin: formData.is_admin,
          is_active: formData.is_active,
        }
        await authApi.createUser(payload)
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.detail || 'حدث خطأ أثناء حفظ البيانات.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return
    setDeleting(true)
    try {
      await authApi.deleteUser(deleteUserId)
      setDeleteUserId(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'حدث خطأ أثناء حذف الحساب.')
    } finally {
      setDeleting(false)
    }
  }

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const username = u.username || ''
    const email = u.email || ''
    const query = searchQuery.toLowerCase()
    return username.toLowerCase().includes(query) || email.toLowerCase().includes(query)
  })

  // Statistics
  const totalUsers = users.length
  const adminsCount = users.filter((u) => u.is_admin).length
  const activeCount = users.filter((u) => u.is_active).length

  return (
    <div className="animate-in">
      {/* 1. Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="fw-800" style={{ fontSize: '1.8rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <i className="fa-solid fa-user-shield"></i>
          الحسابات المسجلة
        </h2>
        <p className="text-muted" style={{ fontSize: '.95rem', marginTop: '.3rem' }}>
          إدارة الحسابات المسجلة القادرة على تسجيل الدخول للوحة التحكم وتعديل الإعدادات.
        </p>
      </div>

      {/* 2. KPIs/Stats Row */}
      <div className="kpi-grid">
        <KPICard
          label="إجمالي الحسابات"
          value={totalUsers}
          icon="fa-users"
          iconColor="#8b5cf6"
          sub="حسابات نشطة وغير نشطة"
        />

        <KPICard
          label="المدراء (Admins)"
          value={adminsCount}
          icon="fa-shield-halved"
          iconColor="#f59e0b"
          sub="يمتلكون صلاحيات كاملة"
          highlight
        />

        <KPICard
          label="الحسابات النشطة"
          value={activeCount}
          icon="fa-circle-check"
          iconColor="#10b981"
          sub="يمكنهم استخدام النظام حالياً"
        />
      </div>

      {/* 3. Main Data Card */}
      <div className="card">
        <div className="card-header d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="card-title fw-800" style={{ fontSize: '1.2rem' }}>قائمة حسابات المستخدمين</h3>
            <div className="text-muted text-small mt-1">تصفية وبحث وإدارة الحسابات النشطة بالمنصة</div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Field */}
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="ابحث باسم المستخدم أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: '2.5rem', borderRadius: 'var(--radius-md)', paddingLeft: '1rem' }}
              />
              <i
                className="fa-solid fa-magnifying-glass text-muted"
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            {/* Add User Button */}
            <button
              className="btn btn-primary d-flex align-center gap-1"
              onClick={() => handleOpenModal(null)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
            >
              <i className="fa-solid fa-user-plus"></i>
              إضافة مستخدم جديد
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner center />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={searchQuery ? "لا توجد نتائج مطابقة" : "لا يوجد مستخدمون مسجلون"}
            desc={searchQuery ? "جرّب البحث بكلمات أخرى أو امسح حقل البحث." : "لم يتم العثور على حسابات مستخدمين مسجلة."}
            icon={searchQuery ? "fa-magnifying-glass" : "fa-user-slash"}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>اسم المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>صلاحية الحساب</th>
                  <th>حالة الحساب</th>
                  <th>تاريخ التسجيل</th>
                  <th style={{ textAlign: 'center' }}>العمليات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={{ transition: 'all var(--transition)' }}>
                    <td className="fw-bold" style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          background: u.is_admin ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-light)',
                          color: u.is_admin ? 'var(--gold)' : 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontWeight: '800'
                        }}
                      >
                        {u.is_admin ? (
                          <i className="fa-solid fa-user-gear"></i>
                        ) : (
                          <i className="fa-solid fa-store"></i>
                        )}
                      </div>
                      <div>
                        <div>{u.username}</div>
                        <div className="text-muted text-small" style={{ fontSize: '.75rem' }}>
                          ID: {u.id}
                        </div>
                      </div>
                    </td>
                    <td>{u.email || <span className="text-muted">—</span>}</td>
                    <td>
                      {u.is_admin ? (
                        <span className="badge badge-warning" style={{ fontWeight: '700' }}>
                          <i className="fa-solid fa-shield-halved" style={{ marginLeft: '4px' }}></i>
                          حساب مدير
                        </span>
                      ) : (
                        <span className="badge badge-info" style={{ fontWeight: '700', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          <i className="fa-solid fa-store" style={{ marginLeft: '4px' }}></i>
                         حساب مستخدم 
                        </span>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-success" style={{ fontWeight: '700' }}>
                          <i className="fa-solid fa-circle" style={{ fontSize: '.4rem', marginLeft: '4px' }}></i>
                          نشط
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontWeight: '700' }}>
                          <i className="fa-solid fa-circle-xmark" style={{ marginLeft: '4px' }}></i>
                          موقف
                        </span>
                      )}
                    </td>
                    <td>
                      {new Date(u.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex justify-center gap-1" style={{ justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenModal(u)}
                          title="تعديل الحساب"
                          style={{ padding: '.45rem .6rem', borderRadius: 'var(--radius-sm)' }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        {u.id !== user.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteUserId(u.id)}
                            title="حذف الحساب"
                            style={{ padding: '.45rem .6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger)', border: 'none', color: '#fff' }}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal for Creating/Editing Users */}
      {modalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99998,
            backdropFilter: 'blur(6px)',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #1e1e2e)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="d-flex justify-between align-center mb-4"
              style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}
            >
              <h3
                className="m-0 fw-800"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  fontSize: '1.2rem',
                  color: 'var(--accent)',
                }}
              >
                {editingUser ? (
                  <>
                    <i className="fa-solid fa-user-pen" />
                    تعديل الحساب: {editingUser.username}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus" />
                    إنشاء حساب جديد
                  </>
                )}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '.9rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                }}
              >
                <i className="fa-solid fa-triangle-exclamation" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              {/* Username */}
              <div className="form-group mb-3">
                <label className="form-label fw-bold mb-1 d-block">اسم المستخدم *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="مثال: salla_store"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              {/* Email */}
              <div className="form-group mb-3">
                <label className="form-label fw-bold mb-1 d-block">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="مثال: store@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Password */}
              <div className="form-group mb-3">
                <label className="form-label fw-bold mb-1 d-block">
                  {editingUser ? 'كلمة المرور الجديدة (اتركه فارغاً لعدم التعديل)' : 'كلمة المرور *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  className="form-input"
                  placeholder="أدخل كلمة مرور قوية..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {/* Account Type / Rank */}
              <div className="form-group mb-3">
                <label className="form-label fw-bold mb-1 d-block">نوع الحساب (الرتبة)</label>
                <select
                  className="form-input"
                  value={formData.is_admin ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.value === 'true' })}
                >
                  <option value="false">حساب مستخدم (User)</option>
                  <option value="true">حساب مدير (Administrator)</option>
                </select>
              </div>

              {/* Active Switch */}
              <div className="form-group mb-4 d-flex align-center gap-2">
                <input
                  type="checkbox"
                  id="user_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="user_is_active" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '.95rem' }}>
                  حساب نشط ويمكنه الدخول للنظام
                </label>
              </div>

              {/* Submit / Cancel Actions */}
              <div className="d-flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-center gap-1"
                  disabled={saving}
                >
                  {saving && <i className="fa-solid fa-spinner fa-spin" />}
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteUserId && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(6px)',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setDeleteUserId(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #1e1e2e)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              border: '1px solid var(--danger-light, rgba(239, 68, 68, 0.2))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="fw-800 mb-3"
              style={{
                fontSize: '1.2rem',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '.5rem',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" />
              تأكيد حذف الحساب
            </h3>
            <p style={{ fontSize: '.95rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              هل أنت متأكد من رغبتك في حذف هذا الحساب؟
              <br />
              <strong style={{ color: '#ef4444' }}>تحذير هام:</strong> سيؤدي حذف الحساب إلى حذف كافة البيانات التابعة له بشكل نهائي (السلات المهجورة، العملاء، الرسائل، إعدادات المتجر). هذه العملية لا يمكن التراجع عنها!
            </p>

            <div className="d-flex justify-end gap-2 mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteUserId(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                className="btn btn-danger d-flex align-center gap-1"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ backgroundColor: 'var(--danger)', border: 'none', color: '#fff' }}
              >
                {deleting && <i className="fa-solid fa-spinner fa-spin" />}
                نعم، احذف الحساب نهائياً
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
