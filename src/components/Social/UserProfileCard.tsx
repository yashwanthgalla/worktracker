import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Globe } from 'lucide-react';
import { useFollowCounts } from '../../hooks/useFollow';
import { FollowButton } from './FollowButton';
import { FollowersModal } from './FollowersModal';
import { useAppStore } from '../../store/appStore';
import type { UserProfile } from '../../types/database.types';

interface UserProfileCardProps {
  profile: UserProfile;
  showFollowButton?: boolean;
  compact?: boolean;
}

export const UserProfileCard = ({
  profile,
  showFollowButton = true,
  compact = false,
}: UserProfileCardProps) => {
  const currentUser = useAppStore((s) => s.user);
  const { counts } = useFollowCounts(profile.id);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);
  const isOwnProfile = currentUser?.id === profile.id;

  const name = profile.full_name || profile.username || profile.email.split('@')[0];
  const initial = name[0]?.toUpperCase() || '?';
  const displayUsername = profile.username ? `@${profile.username}` : null;
  const isOnline = profile.status === 'online';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">{initial}</span>
            )}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          {displayUsername && <p className="text-xs text-gray-400 truncate">{displayUsername}</p>}
        </div>
        {showFollowButton && !isOwnProfile && (
          <FollowButton targetUserId={profile.id} size="sm" />
        )}
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        {/* Banner */}
        <div className="h-20 bg-linear-to-r from-emerald-400 via-teal-400 to-cyan-400" />

        {/* Profile Content */}
        <div className="px-5 pb-5">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center border-4 border-white shadow-sm">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">{initial}</span>
                )}
              </div>
              {isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-3 border-white" />
              )}
            </div>
            {showFollowButton && !isOwnProfile && (
              <div className="mb-1">
                <FollowButton targetUserId={profile.id} size="md" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">{name}</h3>
              {profile.is_private ? (
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            {displayUsername && (
              <p className="text-sm text-gray-500">{displayUsername}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-600 mt-1.5">{profile.bio}</p>
            )}
          </div>

          {/* Counts */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => setModalType('followers')}
              className="group hover:opacity-80 transition-opacity"
            >
              <span className="text-base font-bold text-gray-900">{counts.followers}</span>
              <span className="text-sm text-gray-500 ml-1">followers</span>
            </button>
            <button
              onClick={() => setModalType('following')}
              className="group hover:opacity-80 transition-opacity"
            >
              <span className="text-base font-bold text-gray-900">{counts.following}</span>
              <span className="text-sm text-gray-500 ml-1">following</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <FollowersModal
        userId={profile.id}
        type="followers"
        isOpen={modalType === 'followers'}
        onClose={() => setModalType(null)}
      />
      <FollowersModal
        userId={profile.id}
        type="following"
        isOpen={modalType === 'following'}
        onClose={() => setModalType(null)}
      />
    </>
  );
};
