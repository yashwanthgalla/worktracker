import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthForm } from './components/Auth/AuthForm';
import { DashboardLayout } from './components/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TaskList } from './components/Tasks/TaskList';
import { CalendarView } from './components/Calendar/CalendarView';
import { Analytics } from './components/Analytics/Analytics';
import { FocusTimer } from './components/Timer/FocusTimer';
import { AIInsights } from './components/AI/AIInsights';
import { MessagesPage } from './components/Messages/MessagesPage';
import { FriendsPage } from './components/Friends/FriendsPage';
import { SettingsPage } from './components/Settings/SettingsPage';

import { AuthService } from './services/authService';
import { FriendService } from './services/friendService';
import { useAppStore } from './store/appStore';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppContent() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    AuthService.getCurrentUser().then((u) => {
      setUser(u);
      if (u) FriendService.ensureProfile().catch(console.warn);
      setLoading(false);
    });

    // Listen for auth changes
    const unsub = AuthService.onAuthStateChange((u) => {
      setUser(u);
      if (u) FriendService.ensureProfile().catch(console.warn);
    });
    return unsub;
  }, [setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthForm />;

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/timer" element={<FocusTimer />} />
        <Route path="/ai" element={<AIInsights />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#f9fafb', borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
          }}
        />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
