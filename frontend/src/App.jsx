import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'

import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Carts from './pages/Carts'
import RecoveredCarts from './pages/RecoveredCarts'
import Messages from './pages/Messages'
import Customers from './pages/Customers'
import Reviews from './pages/Reviews'
import RegisteredCustomers from './pages/RegisteredCustomers'
import Settings from './pages/Settings'
import Stores from './pages/Stores'
import AdminStores from './pages/AdminStores'
import EmailContacts from './pages/EmailContacts'
import EmailCampaigns from './pages/EmailCampaigns'
import EmailLists from './pages/EmailLists'
import EmailDesigns from './pages/EmailDesigns'
import EmailSuppressionGroups from './pages/EmailSuppressionGroups'
import EmailValidation from './pages/EmailValidation'
import DocumentationHome from './pages/DocumentationHome'
import DocumentationSection from './pages/DocumentationSection'

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              <Route path="/signin" element={<SignIn />} />

              {/* Documentation Routes */}
              <Route path="/documentation" element={<DocumentationHome />} />
              <Route path="/documentation/:sectionId" element={<DocumentationSection />} />

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
                <Route path="reviews" element={<Reviews />} />
                <Route path="customers" element={<Customers />} />
                <Route path="registered-customers" element={<RegisteredCustomers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="email/contacts" element={<EmailContacts />} />
                <Route path="email/lists" element={<EmailLists />} />
                <Route path="email/campaigns" element={<EmailCampaigns />} />
                <Route path="email/designs" element={<EmailDesigns />} />
                <Route path="email/suppressions" element={<EmailSuppressionGroups />} />
                <Route path="email/validation" element={<EmailValidation />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

