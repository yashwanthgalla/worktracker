import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthService } from './services/authService';
import { useAppStore } from './store/appStore';
import { AuthForm } from './components/Auth/AuthForm';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TaskList } from './components/Tasks/TaskList';
import { FocusTimer } from './components/Timer/FocusTimer';
import { Analytics } from './components/Analytics/Analytics';
import { AIInsights } from './components/AI/AIInsights';
import { CalendarView } from './components/Calendar/CalendarView';
import { MessagesPage } from './components/Messages/MessagesPage';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  const [loading, setLoading] = useState(true);
  const { user, setUser } = useAppStore();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const unsubscribe = AuthService.onAuthStateChange((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [setUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm onSuccess={() => {}} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              fontSize: '0.875rem',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            },
          }}
        />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/timer" element={<FocusTimer />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai" element={<AIInsights />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/settings" element={<div className="text-center py-20"><h2 className="text-2xl font-semibold text-[#1d1d1f]">Settings</h2><p className="text-[#86868b] mt-2">Coming soon...</p></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1d1d1f',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '14px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            fontSize: '0.9375rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
