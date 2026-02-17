import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Users, Loader2, MessageSquare } from 'lucide-react';
import { useFollowersList, useFollow } from '../../hooks/useFollow';
import { FollowButton } from './FollowButton';
import { useAppStore } from '../../store/appStore';
import type { UserProfile } from '../../types/database.types';

interface FollowersModalProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  onMessage?: (userId: string) => void;
  title?: string;
}

export const FollowersModal = ({
  userId,
  type,
  isOpen,
  onClose,
  onMessage,
  title,
}: FollowersModalProps) => {
  const { list, totalCount, loading, hasMore, loadMore } = useFollowersList(
    isOpen ? userId : null,
    type
  );
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = useAppStore((s) => s.user);

  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const filteredList = searchQuery
    ? list.filter((f) => {
        const profile = type === 'followers' ? f.follower : f.following;
        if (!profile) return false;
        const q = searchQuery.toLowerCase();
        return (
          profile.full_name?.toLowerCase().includes(q) ||
          profile.username?.toLowerCase().includes(q) ||
          profile.email?.toLowerCase().includes(q)
        );
      })
    : list;

  const displayTitle = title || (type === 'followers' ? 'Followers' : 'Following');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[15%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-105 max-h-[70vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {displayTitle}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {totalCount}
                </span>
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && list.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 px-5">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    {searchQuery ? 'No results found' : `No ${type} yet`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {filteredList.map((f) => {
                      const profile = type === 'followers' ? f.follower : f.following;
                      if (!profile) return null;
                      return (
                        <FollowListItem
                          key={f.id}
                          profile={profile}
                          isOwnProfile={profile.id === currentUser?.id}
                          onMessage={onMessage}
                        />
                      );
                    })}
                  </div>

                  {hasMore && !searchQuery && (
                    <div className="px-4 py-3">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          'Load more'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Individual list item ───

function FollowListItem({
  profile,
  isOwnProfile,
  onMessage,
}: {
  profile: UserProfile;
  isOwnProfile: boolean;
  onMessage?: (userId: string) => void;
}) {
  const name = profile.full_name || profile.username || profile.email.split('@')[0];
  const initial = name[0]?.toUpperCase() || '?';
  const displayUsername = profile.username ? `@${profile.username}` : profile.email;
  const { relationship } = useFollow(isOwnProfile ? null : profile.id);
  const canMessage = !isOwnProfile && onMessage && (relationship === 'following' || relationship === 'mutual');

  return (
    <div className="flex items-center gap-3.5 px-5 py-3 hover:bg-gray-50/60 transition-colors">
      <div className="w-11 h-11 rounded-full bg-linear-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shrink-0">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-white text-sm font-bold">{initial}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-400 truncate">{displayUsername}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {!isOwnProfile && (
          <FollowButton targetUserId={profile.id} size="sm" />
        )}
        {canMessage && (
          <button
            onClick={() => onMessage(profile.id)}
            className="p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
            title="Message"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
