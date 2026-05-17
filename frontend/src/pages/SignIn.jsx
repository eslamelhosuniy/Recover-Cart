import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignIn() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <i className="fa-solid fa-cart-shopping" />
          </div>
          <h1>تسجيل الدخول</h1>
          <p>لوحة تحكم Recover Cart</p>
        </div>

        {error && (
          <div className="auth-error animate-in">
            <i className="fa-solid fa-circle-exclamation" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">اسم المستخدم</label>
            <div className="input-with-icon">
              <input
                type="text"
                className="form-input"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
              <i className="fa-solid fa-user input-icon" />
            </div>
          </div>

          <div className="form-group mb-3">
            <label className="form-label">كلمة المرور</label>
            <div className="input-with-icon">
              <input
                type="password"
                className="form-input"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <i className="fa-solid fa-lock input-icon" />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin" /> : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
