import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import MessagesPage from './pages/Messages';
import NotificationsPage from './pages/Notifications';
import CreatePostPage from './pages/CreatePost';
import ProfilePage from './pages/Profile';
import MediaPage from './pages/Media';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes Wrapper */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/reels" element={<MediaPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-center" toastOptions={{
      style: {
        background: '#18181b', // dark gray
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
      },
      success: {
        iconTheme: {
          primary: '#10b981', // emerald-500
          secondary: 'white',
        }
      }
    }} />
  </StrictMode>,
)
