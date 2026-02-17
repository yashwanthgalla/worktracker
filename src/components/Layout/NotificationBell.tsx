import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2, Mail } from 'lucide-react';
import { useRealtimeNotifications } from '../../hooks/useMessaging';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, clearAll } = useRealtimeNotifications();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-black/4 transition-colors"
      >
        <Bell className="w-4.5 h-4.5 text-[#6e6e73]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center bg-linear-to-r from-rose-500 to-orange-400 text-white text-[10px] font-bold rounded-full px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-90 max-h-120 bg-white/95 backdrop-blur-2xl rounded-2xl border border-black/6 shadow-[0_16px_48px_rgba(0,0,0,0.12)] overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/6">
              <h3 className="text-[0.9375rem] font-semibold text-[#1d1d1f]">Notifications</h3>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearAll();
                      setOpen(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/4 transition-colors text-[#86868b]"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/4 transition-colors text-[#86868b]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-100">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-12 h-12 rounded-2xl bg-black/3 flex items-center justify-center mb-3">
                    <Mail className="w-5 h-5 text-[#86868b]" />
                  </div>
                  <p className="text-sm text-[#86868b]">No notifications yet</p>
                  <p className="text-xs text-[#aeaeb2] mt-1">Due date reminders will show here</p>
                </div>
              ) : (
                notifications
                  .slice()
                  .reverse()
                  .map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      className={`px-5 py-3.5 border-b border-black/4 hover:bg-black/2 transition-colors cursor-pointer ${
                        !notif.read ? 'bg-primary-50/40' : ''
                      }`}
                      onClick={() => markRead(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            notif.read ? 'bg-transparent' : 'bg-primary-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.8125rem] font-medium text-[#1d1d1f] truncate">
                            {notif.title}
                          </p>
                          <p className="text-[0.6875rem] text-[#86868b] mt-0.5">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead(notif.id);
                            }}
                            className="p-1 rounded-md hover:bg-black/6 text-[#86868b]"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
