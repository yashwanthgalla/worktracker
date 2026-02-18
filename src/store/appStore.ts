import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Task, WorkSession, ProductivityMetrics } from '../types/database.types';
import type { AppUser } from '../services/authService';

interface AppState {
  // Auth
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  
  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Filters & Views
  taskFilter: 'all' | 'today' | 'week' | 'overdue';
  setTaskFilter: (filter: 'all' | 'today' | 'week' | 'overdue') => void;
  taskStatusFilter: 'all' | 'pending' | 'in_progress' | 'completed';
  setTaskStatusFilter: (filter: 'all' | 'pending' | 'in_progress' | 'completed') => void;
  
  // Work Sessions
  currentSession: WorkSession | null;
  setCurrentSession: (session: WorkSession | null) => void;
  workSessions: WorkSession[];
  setWorkSessions: (sessions: WorkSession[]) => void;
  addWorkSession: (session: WorkSession) => void;
  
  // Productivity
  productivityMetrics: ProductivityMetrics | null;
  setProductivityMetrics: (metrics: ProductivityMetrics) => void;
  
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  viewMode: 'list' | 'kanban' | 'calendar';
  setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
  
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),
      
      // Tasks
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        })),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),
      
      // Filters
      taskFilter: 'all',
      setTaskFilter: (filter) => set({ taskFilter: filter }),
      taskStatusFilter: 'all',
      setTaskStatusFilter: (filter) => set({ taskStatusFilter: filter }),
      
      // Work Sessions
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),
      workSessions: [],
      setWorkSessions: (sessions) => set({ workSessions: sessions }),
      addWorkSession: (session) =>
        set((state) => ({ workSessions: [...state.workSessions, session] })),
      
      // Productivity
      productivityMetrics: null,
      setProductivityMetrics: (metrics) => set({ productivityMetrics: metrics }),
      
      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Theme
      theme: 'dark',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'worktracker-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        viewMode: state.viewMode,
      }),
    }
  )
);
