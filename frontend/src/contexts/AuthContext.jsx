import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, storesApi, emailMarketingApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [stores, setStores] = useState([])
  const [activeStore, setActiveStore] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStores = useCallback(async () => {
    try {
      const res = await storesApi.list()
      const storesList = Array.isArray(res.data) ? res.data : []
      setStores(storesList)
      if (storesList.length > 0) {
        const cachedStoreId = localStorage.getItem('active_store_id') || localStorage.getItem('activeStoreId')
        const active = storesList.find(s => s.id === cachedStoreId) || storesList[0]
        setActiveStore(active)
        localStorage.setItem('active_store_id', active.id)
        localStorage.setItem('activeStoreId', active.id)
      } else {
        setActiveStore(null)
        localStorage.removeItem('active_store_id')
        localStorage.removeItem('activeStoreId')
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err)
      setStores([])
      setActiveStore(null)
    }
  }, [])

  // On mount: verify stored token
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then((res) => {
        setUser(res.data)
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('recover_user')
        localStorage.removeItem('active_store_id')
        localStorage.removeItem('activeStoreId')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user) {
      fetchStores()
    } else {
      setStores([])
      setActiveStore(null)
    }
  }, [user, fetchStores])

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('recover_user', JSON.stringify(userData))
    setUser(userData)
    // Eagerly fetch stores so data is ready before navigation
    await fetchStores()
    return userData
  }, [fetchStores])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('recover_user')
    localStorage.removeItem('active_store_id')
    localStorage.removeItem('activeStoreId')
    setUser(null)
    setStores([])
    setActiveStore(null)
  }, [])

  const switchStore = useCallback((storeId) => {
    localStorage.setItem('active_store_id', storeId)
    localStorage.setItem('activeStoreId', storeId)
    const active = Array.isArray(stores) ? stores.find(s => s.id === storeId) : null
    if (active) {
      setActiveStore(active)
    }
    window.location.reload()
  }, [stores])

  
  // Sync SendGrid data in background on store change
  useEffect(() => {
    if (activeStore?.id) {
      emailMarketingApi.syncSendgridData(activeStore.id).catch(err => {
        console.error("Background sync failed", err)
      })
    }
  }, [activeStore?.id])

  return (
    <AuthContext.Provider value={{ 
      user, 
      stores, 
      activeStore, 
      activeStoreId: activeStore?.id || null,
      activeStoreName: activeStore?.store_name || null,
      loading, 
      login, 
      logout, 
      switchStore, 
      fetchStores,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
