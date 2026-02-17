import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2, Mail, UserPlus, UserCheck, Users } from 'lucide-react';
import { useRealtimeNotifications } from '../../hooks/useMessaging';
import { FollowService } from '../../services/followService';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

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

  const handleAcceptFollow = useCallback(async (followId: string, notifId: string) => {
    try {
      await FollowService.acceptFollowRequest(followId);
      await markRead(notifId);
      toast.success('Follow request accepted');
    } catch {
      toast.error('Failed to accept request');
    }
  }, [markRead]);

  const handleRejectFollow = useCallback(async (followId: string, notifId: string) => {
    try {
      await FollowService.rejectFollowRequest(followId);
      await markRead(notifId);
      toast.success('Follow request rejected');
    } catch {
      toast.error('Failed to reject request');
    }
  }, [markRead]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'follow_request': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'follow_accepted': return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case 'new_follower': return <Users className="w-4 h-4 text-violet-500" />;
      case 'refollow': return <UserPlus className="w-4 h-4 text-teal-500" />;
      case 'friend_request': return <UserPlus className="w-4 h-4 text-amber-500" />;
      case 'friend_accepted': return <UserCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Mail className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-black/4 transition-colors"
      >
        <Bell className="w-4.5 h-4.5 text-text-secondary" />
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
              <h3 className="text-[0.9375rem] font-semibold text-text-primary">Notifications</h3>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearAll();
                      setOpen(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/4 transition-colors text-text-tertiary"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/4 transition-colors text-text-tertiary"
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
                    <Mail className="w-5 h-5 text-text-tertiary" />
                  </div>
                  <p className="text-sm text-text-tertiary">No notifications yet</p>
                  <p className="text-xs text-[#aeaeb2] mt-1">Follow requests and updates will show here</p>
                </div>
              ) : (
                notifications.map((notif) => {
                    const isFollowRequest = notif.type === 'follow_request';
                    const followId = (notif.data as Record<string, unknown>)?.follow_id as string | undefined;

                    return (
                      <motion.div
                        key={notif.id}
                        layout
                        className={`px-5 py-3.5 border-b border-black/4 hover:bg-black/2 transition-colors cursor-pointer ${
                          !notif.read ? 'bg-primary-50/40' : ''
                        }`}
                        onClick={() => !isFollowRequest && markRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.8125rem] font-medium text-text-primary truncate">
                              {notif.title}
                            </p>
                            {notif.body && (
                              <p className="text-[0.75rem] text-text-secondary mt-0.5 truncate">
                                {notif.body}
                              </p>
                            )}
                            <p className="text-[0.6875rem] text-text-tertiary mt-0.5">
                              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                            </p>

                            {/* Accept/Reject buttons for follow requests */}
                            {isFollowRequest && !notif.read && followId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptFollow(followId, notif.id);
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#0095F6] text-white text-[11px] font-bold hover:bg-[#1877F2] transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectFollow(followId, notif.id);
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-semibold hover:bg-gray-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                          {!notif.read && !isFollowRequest && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead(notif.id);
                              }}
                              className="p-1 rounded-md hover:bg-black/6 text-text-tertiary"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
