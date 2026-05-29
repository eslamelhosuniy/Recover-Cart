import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'

import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Carts from './pages/Carts'
import RecoveredCarts from './pages/RecoveredCarts'
import Messages from './pages/Messages'
import Customers from './pages/Customers'
import RegisteredCustomers from './pages/RegisteredCustomers'
import Settings from './pages/Settings'
import Stores from './pages/Stores'
import AdminStores from './pages/AdminStores'

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signin" element={<SignIn />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stores" element={<Stores />} />
            <Route path="admin-stores" element={<AdminStores />} />
            <Route path="carts" element={<Carts />} />
            <Route path="carts/recovered" element={<RecoveredCarts />} />
            <Route path="messages" element={<Messages />} />
            <Route path="customers" element={<Customers />} />
            <Route path="registered-customers" element={<RegisteredCustomers />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </NotificationProvider>
  )
}

