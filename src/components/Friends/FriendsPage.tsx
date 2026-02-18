import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  UserPlus,
  Users,
  X,
  Clock,
  UserCheck,
  MessageSquare,
  ChevronRight,
  Lock,
  Globe,
  Loader2,
} from 'lucide-react';
import { useConversations } from '../../hooks/useMessaging';
import { useFollowRequests, useFollowCounts, useFollowSearch, useFollowersList, useFollow, useFollowBackSuggestions } from '../../hooks/useFollow';
import { FriendService } from '../../services/friendService';
import { FollowButton } from '../Social/FollowButton';
import { FollowersModal } from '../Social/FollowersModal';
import { useAppStore } from '../../store/appStore';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '../../types/database.types';

export const FriendsPage = () => {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const { startDirectChat } = useConversations();

  // Follow system hooks
  const {
    pendingRequests: followPendingRequests,
    sentRequests: followSentRequests,
    loading: followReqLoading,
    accept: acceptFollowReq,
    reject: rejectFollowReq,
    cancel: cancelFollowReq,
  } = useFollowRequests();

  const { counts: myCounts } = useFollowCounts(user?.id || null);
  const { results: followSearchResults, loading: followSearchLoading, search: searchFollowUsers } = useFollowSearch();
  const { list: followingList, loading: followingListLoading, hasMore, loadMore } = useFollowersList(user?.id || null, 'following');
  const { list: followBackList, loading: followBackLoading } = useFollowBackSuggestions();

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'following'>('discover');
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    FriendService.ensureProfile();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) return;
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await searchFollowUsers(query);
      setSearching(false);
    }, 400);
  };

  const handleStartChat = async (friendUserId: string) => {
    const conv = await startDirectChat(friendUserId);
    if (conv) navigate('/messages');
  };

  const totalFollowRequests = followPendingRequests.length + followSentRequests.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Follow Counts */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-1">People</h2>
          <p className="text-gray-500 text-[0.9375rem]">
            Follow people, manage requests, and connect
          </p>
        </div>
        {/* Own follow stats */}
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={() => setFollowersModalOpen(true)}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-lg font-bold text-gray-900">{myCounts.followers}</p>
            <p className="text-[11px] text-gray-500 font-medium">Followers</p>
          </button>
          <div className="w-px h-8 bg-gray-200" />
          <button
            onClick={() => setFollowingModalOpen(true)}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-lg font-bold text-gray-900">{myCounts.following}</p>
            <p className="text-[11px] text-gray-500 font-medium">Following</p>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by username, name, or email..."
          className="w-full pl-12 pr-4 py-3.5 text-sm bg-white border border-gray-200 rounded-2xl focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all placeholder:text-gray-400 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchQuery.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Search Results</h3>
            </div>

            {searching || followSearchLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : followSearchResults.length === 0 ? (
              <div className="text-center py-10 px-5">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No accounts found</p>
                <p className="text-xs text-gray-400 mt-1">Try searching with the full email or username</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {followSearchResults.map((u) => (
                  <SearchResultItem
                    key={u.id}
                    user={u}
                    onMessage={handleStartChat}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'discover' as const, label: 'Discover', icon: UserPlus },
          {
            key: 'requests' as const,
            label: `Requests${totalFollowRequests > 0 ? ` (${totalFollowRequests})` : ''}`,
            icon: UserCheck,
          },
          { key: 'following' as const, label: `Following (${myCounts.following})`, icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 py-3.5 px-5 text-sm font-semibold transition-colors relative ${
              activeTab === tab.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.key && (
              <motion.div layoutId="friends-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* ─── Discover Tab ─── */}
        {activeTab === 'discover' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Hero prompt */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-5">
                <UserPlus className="w-9 h-9 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Follow People</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                Follow people to see their activity and collaborate. Private accounts require approval.
              </p>
              <button
                onClick={() => inputRef.current?.focus()}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200/50"
              >
                Search People
              </button>
            </div>

            {/* Follow Back Suggestions */}
            {!followBackLoading && followBackList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <UserPlus className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Follow Back</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {followBackList.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {followBackList.slice(0, 5).map((f) => {
                    const profile = f.follower;
                    if (!profile) return null;
                    const name = profile.full_name || profile.username || profile.email?.split('@')[0] || 'Unknown';
                    const initial = name[0]?.toUpperCase() || '?';
                    const displayUsername = profile.username ? `@${profile.username}` : profile.email || '';
                    return (
                      <div key={f.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-bold">{initial}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{displayUsername}</p>
                          <p className="text-[11px] text-blue-500 font-medium mt-0.5">Follows you</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FollowButton targetUserId={f.follower_id} size="sm" />
                          <button
                            onClick={() => handleStartChat(f.follower_id)}
                            className="p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Message"
                          >
                            <MessageSquare className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {followBackList.length > 5 && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      See all {followBackList.length} suggestions <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick following connections */}
            {followingList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Your Connections</h3>
                  <button
                    onClick={() => setActiveTab('following')}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    See All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="px-4 py-3 flex gap-4 overflow-x-auto">
                  {followingList.slice(0, 8).map((f) => {
                    const profile = (f as unknown as Record<string, unknown>).following as UserProfile | undefined;
                    if (!profile) return null;
                    const name = profile.full_name || profile.username || profile.email?.split('@')[0] || '?';
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleStartChat(profile.id)}
                        className="flex flex-col items-center gap-1.5 shrink-0 group"
                      >
                        <div className="relative p-0.5 rounded-full bg-gray-200">
                          <div className="w-14 h-14 rounded-full bg-white p-0.5">
                            <div className="w-full h-full rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                              <span className="text-white text-lg font-bold">
                                {name[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-600 font-medium max-w-15 truncate group-hover:text-gray-900 transition-colors">
                          {name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Requests Tab ─── */}
        {activeTab === 'requests' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Follow Requests Received */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">
                  Follow Requests
                  {followPendingRequests.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {followPendingRequests.length}
                    </span>
                  )}
                </h3>
              </div>

              {followReqLoading && followPendingRequests.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : followPendingRequests.length === 0 ? (
                <div className="text-center py-8 px-5">
                  <UserCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No pending follow requests</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {followPendingRequests.map((req) => {
                    const profile = req.follower;
                    const name = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Unknown';
                    const initial = (profile?.full_name || profile?.username || profile?.email || '?')[0]?.toUpperCase();
                    const displayUsername = profile?.username ? `@${profile.username}` : profile?.email;
                    return (
                      <div key={req.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-bold">{initial}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{displayUsername}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptFollowReq(req.id)}
                            className="px-5 py-2 rounded-lg bg-[#0095F6] text-white text-[13px] font-bold hover:bg-[#1877F2] transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectFollowReq(req.id)}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-[13px] font-semibold hover:bg-gray-200 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sent Follow Requests */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">
                  Sent Requests
                  {followSentRequests.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">({followSentRequests.length})</span>
                  )}
                </h3>
              </div>

              {followSentRequests.length === 0 ? (
                <div className="text-center py-8 px-5">
                  <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No sent requests</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {followSentRequests.map((req) => {
                    const profile = req.following;
                    const name = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Unknown';
                    const initial = (profile?.full_name || profile?.username || profile?.email || '?')[0]?.toUpperCase();
                    const displayUsername = profile?.username ? `@${profile.username}` : profile?.email;
                    return (
                      <div key={req.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-bold">{initial}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{displayUsername}</p>
                        </div>
                        <button
                          onClick={() => cancelFollowReq(req.following_id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-[13px] font-semibold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Following Tab ─── */}
        {activeTab === 'following' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {followingListLoading && followingList.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : followingList.length === 0 ? (
                <div className="text-center py-12 px-5">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-base font-medium text-gray-500">Not following anyone yet</p>
                  <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                    Search for people above to follow them
                  </p>
                  <button
                    onClick={() => { setActiveTab('discover'); inputRef.current?.focus(); }}
                    className="mt-4 px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Find People
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {followingList.map((f) => {
                    const profile = (f as unknown as Record<string, unknown>).following as UserProfile | undefined;
                    const name = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Unknown';
                    const initial = name[0]?.toUpperCase() || '?';
                    const displayUsername = profile?.username ? `@${profile.username}` : profile?.email || '';
                    return (
                      <div key={f.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{initial}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{displayUsername}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FollowButton targetUserId={f.following_id} size="sm" />
                          <button
                            onClick={() => handleStartChat(f.following_id)}
                            className="p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Message"
                          >
                            <MessageSquare className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      className="w-full py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Followers/Following Modals */}
      {user && (
        <>
          <FollowersModal
            userId={user.id}
            type="followers"
            isOpen={followersModalOpen}
            onClose={() => setFollowersModalOpen(false)}
            onMessage={handleStartChat}
          />
          <FollowersModal
            userId={user.id}
            type="following"
            isOpen={followingModalOpen}
            onClose={() => setFollowingModalOpen(false)}
            onMessage={handleStartChat}
          />
        </>
      )}
    </div>
  );
};

// ─── Search Result Item with FollowButton + Message ───

function SearchResultItem({
  user,
  onMessage,
}: {
  user: UserProfile;
  onMessage: (userId: string) => void;
}) {
  const name = user?.full_name || user?.username || user?.email?.split('@')[0] || 'Unknown User';
  const initial = name[0]?.toUpperCase() || '?';
  const displayUsername = user?.username ? `@${user.username}` : (user?.email || 'No email');
  const { relationship } = useFollow(user?.id || '');
  const canMessage = relationship === 'following' || relationship === 'mutual';

  if (!user?.id) return null;

  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
      <div className="w-12 h-12 rounded-full bg-linear-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shrink-0">
        <span className="text-white text-sm font-bold">{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          {user.is_private ? (
            <Lock className="w-3 h-3 text-gray-400 shrink-0" />
          ) : (
            <Globe className="w-3 h-3 text-gray-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{displayUsername}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <FollowButton targetUserId={user.id} size="md" />
        {canMessage && (
          <button
            onClick={() => onMessage(user.id)}
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
