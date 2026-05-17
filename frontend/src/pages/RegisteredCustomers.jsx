import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
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

  // 1. Guard route: If the logged-in user is not an admin, redirect to Dashboard
  if (!user || !user.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch users from the secure admin-only auth endpoint
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

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const username = u.username || ''
    const email = u.email || ''
    const query = searchQuery.toLowerCase()
    return username.toLowerCase().includes(query) || email.toLowerCase().includes(query)
  })

  // Calculate statistics for the premium cards at the top
  const totalUsers = users.length
  const adminsCount = users.filter((u) => u.is_admin).length
  const activeCount = users.filter((u) => u.is_active).length

  return (
    <div className="animate-in">
      {/* 1. Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="fw-800" style={{ fontSize: '1.8rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <i className="fa-solid fa-user-shield"></i>
          العملاء المسجلون لدينا
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
        <div className="card-header d-flex justify-between align-center">
          <div>
            <h3 className="card-title fw-800" style={{ fontSize: '1.2rem' }}>قائمة حسابات المستخدمين</h3>
            <div className="text-muted text-small mt-1">تصفية وبحث في الحسابات النشطة بالمنصة</div>
          </div>

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
                          <i className="fa-solid fa-user"></i>
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
                          مدير (Admin)
                        </span>
                      ) : (
                        <span className="badge badge-info" style={{ fontWeight: '700' }}>
                          <i className="fa-solid fa-user" style={{ marginLeft: '4px' }}></i>
                          مستخدم
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
