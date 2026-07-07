import axios from 'axios'

const getApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE?.trim()
  const isBrowser = typeof window !== 'undefined'

  if (!envBase) {
    return isBrowser ? `${window.location.origin}/api/v1` : '/api/v1'
  }

  if (envBase.startsWith('/')) {
    return isBrowser ? `${window.location.origin}${envBase}` : envBase
  }

  const isLocalHost = /(?:^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i.test(envBase)
  if (isLocalHost && isBrowser) {
    return `${window.location.origin}/api/v1`
  }

  return envBase
}

const apiClient = axios.create({
  baseURL: getApiBase(),
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT and X-Store-ID on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const storeId = localStorage.getItem('active_store_id') || localStorage.getItem('activeStoreId')
  if (storeId) {
    config.headers['X-Store-ID'] = storeId
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
  createUser: (data) => apiClient.post('/auth/users', data),
  updateUser: (id, data) => apiClient.put(`/auth/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/auth/users/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  kpis: (startDate = '', endDate = '') => {
    let url = '/dashboard/kpis'
    const params = []
    if (startDate) params.push(`start_date=${startDate}`)
    if (endDate) params.push(`end_date=${endDate}`)
    if (params.length > 0) url += `?${params.join('&')}`
    return apiClient.get(url)
  },
  nextJob: () => apiClient.get('/dashboard/next-job'),
}

// ── Carts ─────────────────────────────────────────────────
export const cartsApi = {
  list: (skip = 0, limit = 10, status = '', startDate = '', endDate = '') => {
    let url = `/carts?skip=${skip}&limit=${limit}`
    if (status) url += `&status=${status}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    return apiClient.get(url)
  },
  get: (id) => apiClient.get(`/carts/${id}`),
  remind: (id) => apiClient.post(`/carts/${id}/remind`),
}

// ── Messages ──────────────────────────────────────────────
export const messagesApi = {
  list: (skip = 0, limit = 10, startDate = '', endDate = '', messageType = '') => {
    let url = `/messages?skip=${skip}&limit=${limit}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    if (messageType) url += `&message_type=${messageType}`
    return apiClient.get(url)
  },
  stats: (startDate = '', endDate = '') => {
    let url = '/messages/stats'
    const params = []
    if (startDate) params.push(`start_date=${startDate}`)
    if (endDate) params.push(`end_date=${endDate}`)
    if (params.length > 0) url += `?${params.join('&')}`
    return apiClient.get(url)
  },
}

// ── Customers ─────────────────────────────────────────────
export const customersApi = {
  list: (skip = 0, limit = 10, startDate = '', endDate = '') => {
    let url = `/customers?skip=${skip}&limit=${limit}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    return apiClient.get(url)
  },
  get: (id) => apiClient.get(`/customers/${id}`),
  getCarts: (id) => apiClient.get(`/customers/${id}/carts`),
}

// ── Stores ──────────────────────────────────────────────
export const storesApi = {
  list: () => apiClient.get('/stores'),
  create: (data) => apiClient.post('/stores', data),
  get: (id) => apiClient.get(`/stores/${id}`),
  update: (id, data) => apiClient.put(`/stores/${id}`, data),
  delete: (id) => apiClient.delete(`/stores/${id}`),
}

// ── Settings ──────────────────────────────────────────────
export const settingsApi = {
  get: (storeId) => {
    if (!storeId) {
      return Promise.reject({ response: { status: 400, data: { detail: 'Active store id is missing' } } })
    }
    return apiClient.get(`/stores/${storeId}`)
  },
  update: (storeId, data) => {
    if (!storeId) {
      return Promise.reject({ response: { status: 400, data: { detail: 'Active store id is missing' } } })
    }
    return apiClient.put(`/stores/${storeId}`, data)
  },
  create: (data) => apiClient.post('/stores', data),
}

// ── Logs ──────────────────────────────────────────────────
export const logsApi = {
  errors: (skip = 0, limit = 10) => apiClient.get(`/logs/errors?skip=${skip}&limit=${limit}`),
}

// ── Email Marketing ───────────────────────────────────────
export const emailMarketingApi = {
  getSettings: (storeId) => apiClient.get(`/email-marketing/settings/${storeId}`),
  updateSettings: (storeId, data) => apiClient.put(`/email-marketing/settings/${storeId}`, data),
  
  createContact: (storeId, data) => apiClient.post(`/email-marketing/contacts/${storeId}`, data),
  uploadContacts: (storeId, formData) => apiClient.post(`/email-marketing/contacts/${storeId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  
  createCampaign: (storeId, data) => apiClient.post(`/email-marketing/campaigns/${storeId}`, data),
  getCampaigns: (storeId) => apiClient.get(`/email-marketing/campaigns/${storeId}`),
  updateCampaign: (storeId, campaignId, data) => apiClient.put(`/email-marketing/campaigns/${storeId}/${campaignId}`, data),
  sendCampaign: (storeId, campaignId) => apiClient.post(`/email-marketing/campaigns/${storeId}/${campaignId}/send`),
  runLiveCampaign: (storeId, campaignId) => apiClient.post(`/email-marketing/campaigns/${storeId}/${campaignId}/run-live`),
  
  sendSingleEmail: (storeId, data) => apiClient.post(`/email-marketing/send-email/${storeId}`, data),
  
  getContacts: (storeId, params = {}) => {
    let url = `/email-marketing/contacts-list/${storeId}?`
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value)
      }
    }
    return apiClient.get(url + searchParams.toString())
  },
  updateContact: (storeId, contactId, data) => apiClient.put(`/email-marketing/contacts/${storeId}/${contactId}`, data),
  deleteContact: (storeId, contactId) => apiClient.delete(`/email-marketing/contacts/${storeId}/${contactId}`),

  getLists: (storeId) => apiClient.get(`/email-marketing/lists/${storeId}`),
  createList: (storeId, data) => apiClient.post(`/email-marketing/lists/${storeId}`, data),
  deleteList: (storeId, listId) => apiClient.delete(`/email-marketing/lists/${storeId}/${listId}`),
  getContactsByList: (storeId, listId, params) => apiClient.get(`/email-marketing/contacts/${storeId}/by-list/${listId}`, { params }),
  getSenders: (storeId) => apiClient.get(`/email-marketing/senders/${storeId}`),
  getSuppressionGroups: (storeId) => apiClient.get(`/email-marketing/suppression-groups/${storeId}`),
  createSuppressionGroup: (storeId, data) => apiClient.post(`/email-marketing/suppression-groups/${storeId}`, data),
  deleteSuppressionGroup: (storeId, groupId) => apiClient.delete(`/email-marketing/suppression-groups/${storeId}/${groupId}`),
  syncSendgridData: (storeId) => apiClient.post(`/email-marketing/sync-sendgrid/${storeId}`),
  getChildCampaigns: (storeId, campaignId) => apiClient.get(`/email-marketing/campaigns/${storeId}/${campaignId}/children`),
  getCampaignRunLogs: (storeId, campaignId) => apiClient.get(`/email-marketing/campaigns/${storeId}/${campaignId}/runs`),
  getCampaignsStats: (storeId, campaignIdsStr) => apiClient.get(`/email-marketing/campaigns/${storeId}/stats`, { params: { campaign_ids: campaignIdsStr } }),
  getDesigns: (storeId) => apiClient.get(`/email-marketing/designs/${storeId}`),
  getDesign: (storeId, designId) => apiClient.get(`/email-marketing/designs/${storeId}/${designId}`),
  deleteDesign: (storeId, designId) => apiClient.delete(`/email-marketing/designs/${storeId}/${designId}`),
}

// ── Reviews ───────────────────────────────────────────────
export const reviewsApi = {
  list: (skip = 0, limit = 10, startDate, endDate) => {
    let url = `/customer-reviews?skip=${skip}&limit=${limit}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    return apiClient.get(url)
  },
  getById: (id) => apiClient.get(`/customer-reviews/${id}`),
  getByCustomerId: (customerId) => apiClient.get(`/customer-reviews/customer/${customerId}`),
  stats: (startDate, endDate) => {
    let url = '/customer-reviews/stats/overview'
    if (startDate) url += `?start_date=${startDate}`
    if (endDate) url += `${startDate ? '&' : '?'}end_date=${endDate}`
    return apiClient.get(url)
  },
}

// ── Email Validation ─────────────────────────────────────────
export const emailValidationApi = {
  start: () => apiClient.post('/email-validation/start'),
  stats: () => apiClient.get('/email-validation/stats'),
  listContacts: (skip = 0, limit = 50) => apiClient.get(`/email-validation/contacts?skip=${skip}&limit=${limit}`),
  validateSingle: (contactId) => apiClient.post(`/email-validation/validate/${contactId}`),
}

export default apiClient
