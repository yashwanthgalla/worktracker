import { Search, Command, Mail, UserPlus } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

const headerTabs = [
  { label: 'Dashboard', path: '/' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Analytics', path: '/analytics' },
];

export const Header = () => {
  const productivityMetrics = useAppStore((state) => state.productivityMetrics);
  const user = useAppStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      {/* Left: Tabs */}
      <div className="flex items-center gap-1">
        {headerTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {/* Right: Search + Icons */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              className="w-56 pl-9 pr-16 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-gray-400"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
              <Command className="w-3 h-3" /> F
            </div>
          </div>
        </div>

        {/* Score Badge */}
        {productivityMetrics && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-semibold text-emerald-700">
              {productivityMetrics.daily_score}
            </span>
          </div>
        )}

        {/* Add Friends */}
        <button
          onClick={() => navigate('/friends')}
          className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-emerald-600 relative"
          title="Add Friends"
        >
          <UserPlus className="w-4.5 h-4.5" />
        </button>

        {/* Action icons */}
        <button
          onClick={() => navigate('/messages')}
          className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          title="Messages"
        >
          <Mail className="w-4.5 h-4.5" />
        </button>

        <NotificationBell />

        {/* User Avatar */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center ring-2 ring-white shadow-sm">
            <span className="text-white text-xs font-bold">
              {user?.email?.[0].toUpperCase() || 'U'}
            </span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 -ml-3 mb-3 border border-white"></div>
        </div>
      </div>
    </header>
  );
};
