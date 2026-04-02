import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import './styles.css'
import { AuthProvider } from './lib/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PublisherDashboard from './pages/PublisherDashboard'
import AdminDashboard from './pages/AdminDashboard'
import StoryFormPage from './pages/StoryFormPage'
import StoryDetailPage from './pages/StoryDetailPage'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import { initPosthog } from './lib/posthog'

initPosthog()

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Home: Published stories list
      { index: true, element: <StoryDetailPage listMode /> },
      // Login/Register
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      // Single story detail
      { path: 'stories/:slug', element: <StoryDetailPage /> },
      // Publisher routes
      {
        path: 'publisher',
        element: <ProtectedRoute />,
        children: [
          {
            element: <RoleRoute allowedRoles={['publisher']} />,
            children: [
              { path: 'dashboard', element: <PublisherDashboard /> },
              { path: 'stories/new', element: <StoryFormPage /> },
              { path: 'stories/:id/edit', element: <StoryFormPage /> },
            ],
          },
        ],
      },
      // Admin routes
      {
        path: 'admin',
        element: <ProtectedRoute />,
        children: [
          {
            element: <RoleRoute allowedRoles={['admin']} />,
            children: [{ path: 'dashboard', element: <AdminDashboard /> }],
          },
        ],
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider future={{ v7_startTransition: true }} router={router} />
    </AuthProvider>
  </React.StrictMode>,
)

