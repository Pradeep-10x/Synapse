import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Landing & Auth are eager (first paint / public). Everything behind auth is
// lazy-loaded so the initial bundle stays small and each page is its own chunk.
import Landing from './pages/Landing';
import AuthPage from './pages/Auth';

const FeedPage = lazy(() => import('./pages/Feed'));
const PersonalPage = lazy(() => import('./pages/Personal'));
const CreatePage = lazy(() => import('./pages/Create'));
const CommunityPage = lazy(() => import('./pages/Community'));
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'));
const DiscoverCommunities = lazy(() => import('./pages/DiscoverCommunities'));
const SearchPage = lazy(() => import('./pages/Search'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const MessagesPage = lazy(() => import('./pages/Messages'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const EditProfilePage = lazy(() => import('./pages/EditProfile'));
const PostDetail = lazy(() => import('./pages/PostDetail'));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <Router>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />

        {/* Protected Routes with persistent layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/personal" element={<PersonalPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/communities" element={<CommunityPage />} />
            <Route path="/community/:id" element={<CommunityDetail />} />
            <Route path="/discover-communities" element={<DiscoverCommunities />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/post/:postId" element={<PostDetail />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 15, 0.9)',

            color: '#fff',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            backdropFilter: 'blur(10px)',
          },
          success: {
            iconTheme: {
              primary: '#a855f7',
              secondary: 'white',
            }
          }
        }}
      />
    </Router>
    </QueryClientProvider>
  );
}
//root
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

