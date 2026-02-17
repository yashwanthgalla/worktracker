import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Shield,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { useFollow } from '../../hooks/useFollow';
import type { FollowRelationship } from '../../types/database.types';

interface FollowButtonProps {
  targetUserId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onAction?: (action: string) => void;
}

export const FollowButton = ({
  targetUserId,
  size = 'md',
  showLabel = true,
  className = '',
  onAction,
}: FollowButtonProps) => {
  const {
    relationship,
    loading,
    actionLoading,
    follow,
    unfollow,
    cancelRequest,
    block,
    unblock,
  } = useFollow(targetUserId);

  const [showMenu, setShowMenu] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  const handleFollow = useCallback(async () => {
    await follow();
    onAction?.('follow');
  }, [follow, onAction]);

  const handleUnfollow = useCallback(async () => {
    if (!confirmUnfollow) {
      setConfirmUnfollow(true);
      setTimeout(() => setConfirmUnfollow(false), 3000);
      return;
    }
    await unfollow();
    setConfirmUnfollow(false);
    onAction?.('unfollow');
  }, [unfollow, confirmUnfollow, onAction]);

  const handleCancel = useCallback(async () => {
    await cancelRequest();
    onAction?.('cancel');
  }, [cancelRequest, onAction]);

  const handleBlock = useCallback(async () => {
    await block();
    setShowMenu(false);
    onAction?.('block');
  }, [block, onAction]);

  const handleUnblock = useCallback(async () => {
    await unblock();
    onAction?.('unblock');
  }, [unblock, onAction]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${sizeClasses[size].wrapper} ${className}`}>
        <Loader2 className={`${sizeClasses[size].icon} animate-spin text-gray-300`} />
      </div>
    );
  }

  const buttonContent = getButtonConfig(relationship, confirmUnfollow);

  // Blocked state
  if (relationship === 'blocked') {
    return (
      <button
        onClick={handleUnblock}
        disabled={actionLoading}
        className={`${sizeClasses[size].wrapper} rounded-lg font-semibold transition-all duration-200 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 ${className}`}
      >
        {actionLoading ? (
          <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
        ) : (
          <>
            <Shield className={sizeClasses[size].icon} />
            {showLabel && <span>Unblock</span>}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (relationship === 'none' || relationship === 'follower') handleFollow();
            else if (relationship === 'requested') handleCancel();
            else if (relationship === 'following' || relationship === 'mutual') handleUnfollow();
          }}
          disabled={actionLoading}
          className={`${sizeClasses[size].wrapper} rounded-lg font-semibold transition-all duration-200 ${buttonContent.classes} ${className}`}
        >
          {actionLoading ? (
            <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
          ) : (
            <>
              <buttonContent.icon className={sizeClasses[size].icon} />
              {showLabel && <span>{buttonContent.label}</span>}
            </>
          )}
        </motion.button>

        {/* More menu for following/mutual states */}
        {(relationship === 'following' || relationship === 'mutual') && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50"
                >
                  <button
                    onClick={handleBlock}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Block user
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Styling helpers ───

const sizeClasses = {
  sm: {
    wrapper: 'flex items-center gap-1 px-3 py-1.5 text-[11px]',
    icon: 'w-3 h-3',
  },
  md: {
    wrapper: 'flex items-center gap-1.5 px-5 py-2 text-[13px]',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    wrapper: 'flex items-center gap-2 px-6 py-2.5 text-sm',
    icon: 'w-4 h-4',
  },
};

function getButtonConfig(
  relationship: FollowRelationship,
  confirmUnfollow: boolean
): { label: string; icon: typeof UserPlus; classes: string } {
  switch (relationship) {
    case 'none':
      return {
        label: 'Follow',
        icon: UserPlus,
        classes: 'bg-[#0095F6] text-white hover:bg-[#1877F2] shadow-sm',
      };
    case 'requested':
      return {
        label: 'Requested',
        icon: Clock,
        classes: 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100',
      };
    case 'following':
      return {
        label: confirmUnfollow ? 'Unfollow?' : 'Following',
        icon: confirmUnfollow ? UserX : UserCheck,
        classes: confirmUnfollow
          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100',
      };
    case 'follower':
      return {
        label: 'Follow Back',
        icon: UserPlus,
        classes: 'bg-[#0095F6] text-white hover:bg-[#1877F2] shadow-sm',
      };
    case 'mutual':
      return {
        label: confirmUnfollow ? 'Unfollow?' : 'Mutual',
        icon: confirmUnfollow ? UserX : UserCheck,
        classes: confirmUnfollow
          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
      };
    case 'blocked':
      return {
        label: 'Blocked',
        icon: Shield,
        classes: 'bg-red-50 text-red-600 border border-red-200',
      };
    default:
      return {
        label: 'Follow',
        icon: UserPlus,
        classes: 'bg-[#0095F6] text-white hover:bg-[#1877F2] shadow-sm',
      };
  }
}
