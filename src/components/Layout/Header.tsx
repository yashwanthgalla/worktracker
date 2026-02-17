import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { NotificationBell } from './NotificationBell';
import { Search, Command, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const pageTitle: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/timer': 'Focus Timer',
  '/analytics': 'Analytics',
  '/ai': 'AI Insights',
  '/messages': 'Messages',
  '/settings': 'Settings',
};

export const Header = () => {
  const user = useAppStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const title = pageTitle[location.pathname] || 'WorkTracker';

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 bg-white/72 backdrop-blur-xl backdrop-saturate-[180%] border-b border-black/[0.06]"
    >
      <div className="flex items-center justify-between px-8 py-3.5">
        {/* Page Title */}
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">{title}</h2>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <motion.div
              animate={{ width: searchOpen ? 280 : 40 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex items-center bg-black/[0.03] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2.5 flex-shrink-0 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
              {searchOpen && (
                <motion.input
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                    if (e.key === 'Enter' && searchQuery) {
                      navigate(`/tasks?q=${encodeURIComponent(searchQuery)}`);
                      setSearchOpen(false);
                    }
                  }}
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#aeaeb2] pr-3"
                />
              )}
            </motion.div>
          </div>

          {/* Quick Add */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/tasks')}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
          </motion.button>

          {/* Notifications */}
          <NotificationBell />
        </div>
      </div>
    </motion.header>
  );
};
