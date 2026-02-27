import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  Timer,
  Settings,
  Sparkles,
  Calendar,
  MessageSquare,
  HelpCircle,
  UserPlus,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ListTodo, label: 'Tasks', path: '/tasks' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Timer, label: 'Timer', path: '/timer' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Sparkles, label: 'AI Insights', path: '/ai' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: UserPlus, label: 'Friends', path: '/friends' },
];

const bottomItems = [
  { icon: HelpCircle, label: 'Help', path: '/help' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar = () => {
  return (
    <motion.div
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className="w-22 h-screen bg-white border-r border-gray-200 flex flex-col items-center py-5"
    >
      {/* Logo */}
      <div className="mb-8">
        <img src="/Logo.png" alt="WorkTracker" className="w-10 h-10 rounded-xl object-contain" />
        <p className="text-[9px] text-gray-400 text-center mt-1 font-medium">WorkTracker</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="w-full"
          >
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center gap-1 w-full px-2 mb-3">
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 w-full group ${
                isActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </motion.div>
  );
};
