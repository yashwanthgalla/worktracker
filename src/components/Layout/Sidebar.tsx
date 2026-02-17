import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../services/authService';
import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, CheckSquare, Clock, BarChart3, Brain,
  Calendar, MessageSquare, Settings, LogOut, ChevronLeft,
  ChevronRight, Sparkles, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/timer', icon: Clock, label: 'Focus Timer' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/ai', icon: Brain, label: 'AI Insights' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAppStore((state) => state.user);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await AuthService.signOut();
    navigate('/');
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-screen sticky top-0 flex flex-col bg-white/80 backdrop-blur-xl border-r border-black/[0.06] z-30 overflow-hidden"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"
        >
          <Zap className="w-5 h-5 text-white" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-base font-bold text-[#1d1d1f] tracking-tight">WorkTracker</h1>
              <p className="text-[10px] text-[#86868b] font-medium uppercase tracking-wider">Pro</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-[#6e6e73] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-emerald-50 rounded-xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className={`text-[0.8125rem] font-medium whitespace-nowrap ${isActive ? 'text-emerald-700' : ''}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Collapse */}
      <div className="p-3 space-y-2 border-t border-black/[0.04]">
        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-black/[0.03] transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitial}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1d1d1f] truncate">{userName}</p>
                <p className="text-[10px] text-[#86868b] truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings + Sign Out */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
              isActive ? 'bg-gray-100 text-[#1d1d1f]' : 'text-[#86868b] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
            }`
          }
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[0.8125rem] font-medium">Settings</motion.span>}
          </AnimatePresence>
        </NavLink>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#86868b] hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[0.8125rem] font-medium">Sign Out</motion.span>}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-black/[0.03] text-[#86868b] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
};
