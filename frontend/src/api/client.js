import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — clear token and redirect
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('recover_user')
      // Redirect only if not already on signin
      if (!window.location.pathname.startsWith('/signin')) {
        window.location.href = '/signin'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────
export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
  users: () => apiClient.get('/auth/users'),
}

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  kpis: () => apiClient.get('/dashboard/kpis'),
  nextJob: () => apiClient.get('/dashboard/next-job'),
}

// ── Carts ─────────────────────────────────────────────────
export const cartsApi = {
  list: (skip = 0, limit = 10) => apiClient.get(`/carts?skip=${skip}&limit=${limit}`),
  get: (id) => apiClient.get(`/carts/${id}`),
  remind: (id) => apiClient.post(`/carts/${id}/remind`),
}

// ── Messages ──────────────────────────────────────────────
export const messagesApi = {
  list: (skip = 0, limit = 10) => apiClient.get(`/messages?skip=${skip}&limit=${limit}`),
  stats: () => apiClient.get('/messages/stats'),
}

// ── Customers ─────────────────────────────────────────────
export const customersApi = {
  list: (skip = 0, limit = 10) => apiClient.get(`/customers?skip=${skip}&limit=${limit}`),
  get: (id) => apiClient.get(`/customers/${id}`),
  getCarts: (id) => apiClient.get(`/customers/${id}/carts`),
}

// ── Settings ──────────────────────────────────────────────
export const settingsApi = {
  get: () => apiClient.get('/settings'),
  create: (data) => apiClient.post('/settings', data),
  update: (data) => apiClient.put('/settings', data),
}

// ── Logs ──────────────────────────────────────────────────
export const logsApi = {
  errors: (skip = 0, limit = 10) => apiClient.get(`/logs/errors?skip=${skip}&limit=${limit}`),
}

export default apiClient
