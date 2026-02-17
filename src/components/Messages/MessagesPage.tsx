import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  UserPlus,
  Users,
  MessageSquare,
  Check,
  X,
  MoreVertical,
  Smile,
  ChevronLeft,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useFriends, useConversations, useMessages } from '../../hooks/useMessaging';
import { FriendService } from '../../services/friendService';
import type { Conversation } from '../../types/database.types';
import { formatDistanceToNow } from 'date-fns';

// ═══════════════════════════════════════════
// Main Messages Page
// ═══════════════════════════════════════════
export const MessagesPage = () => {
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const user = useAppStore((s) => s.user);

  // Initialize user profile on mount
  useEffect(() => {
    FriendService.ensureProfile();
    FriendService.updateOnlineStatus('online');

    const handleBeforeUnload = () => {
      FriendService.updateOnlineStatus('offline');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      FriendService.updateOnlineStatus('offline');
    };
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
  };

  const handleBack = () => {
    setShowMobileChat(false);
    setSelectedConversation(null);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Left Panel - Conversations / Friends */}
      <div className={`w-full lg:w-80 xl:w-96 border-r border-gray-200 flex flex-col ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'chats'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1.5" />
            Chats
            {activeTab === 'chats' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'friends'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Friends
            {activeTab === 'friends' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chats' ? (
            <ConversationList
              userId={user?.id || ''}
              onSelect={handleSelectConversation}
              selectedId={selectedConversation?.id || null}
            />
          ) : (
            <FriendsPanel
              onStartChat={(conv) => {
                setSelectedConversation(conv);
                setActiveTab('chats');
                setShowMobileChat(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className={`flex-1 flex flex-col ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
        {selectedConversation ? (
          <ChatPanel
            conversation={selectedConversation}
            currentUserId={user?.id || ''}
            onBack={handleBack}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// Conversation List
// ═══════════════════════════════════════════
function ConversationList({
  userId,
  onSelect,
  selectedId,
}: {
  userId: string;
  onSelect: (conv: Conversation) => void;
  selectedId: string | null;
}) {
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const otherParticipant = c.participants?.find((p) => p.user_id !== userId);
    const name = c.name || otherParticipant?.user?.full_name || otherParticipant?.user?.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No conversations yet</p>
            <p className="text-xs text-gray-300 mt-1">Add friends to start chatting</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const other = conv.participants?.find((p) => p.user_id !== userId);
            const otherUser = other?.user;
            const displayName = conv.name || otherUser?.full_name || otherUser?.email?.split('@')[0] || 'Unknown';
            const isOnline = otherUser?.status === 'online';
            const isSelected = selectedId === conv.id;

            return (
              <motion.button
                key={conv.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 ${
                  isSelected
                    ? 'bg-emerald-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {displayName[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    {conv.last_message && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="shrink-0 ml-2 min-w-4.5 h-4.5 flex items-center justify-center bg-emerald-500 text-white text-[10px] font-bold rounded-full px-1">
                        {conv.unread_count! > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Friends Panel
// ═══════════════════════════════════════════
function FriendsPanel({ onStartChat }: { onStartChat: (conv: Conversation) => void }) {
  const {
    friends,
    pendingRequests,
    searchResults,
    loading,
    searchUsers,
    sendRequest,
    acceptRequest,
    rejectRequest,
  } = useFriends();
  const { startDirectChat } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) return;
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await searchUsers(query);
      setSearching(false);
    }, 400);
  };

  const handleStartChat = async (friendUserId: string) => {
    const conv = await startDirectChat(friendUserId);
    if (conv) onStartChat(conv);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Users */}
      <div className="p-3">
        <div className="relative">
          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users by email or name..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="px-3 pb-3">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">Search Results</h4>
            {searching ? (
              <div className="text-center py-3">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No users found</p>
            ) : (
              searchResults.map((u) => {
                const isFriend = friends.some((f) => f.friend.id === u.id);
                const isPending = pendingRequests.some((r) => r.requester.id === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {(u.full_name || u.email)[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || u.email.split('@')[0]}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    {isFriend ? (
                      <span className="text-xs text-emerald-600 font-medium">Friends</span>
                    ) : isPending ? (
                      <span className="text-xs text-amber-500 font-medium">Pending</span>
                    ) : (
                      <button
                        onClick={() => sendRequest(u.id)}
                        className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })
            )}
            <div className="border-b border-gray-100 my-2" />
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="px-3 pb-3">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
              Pending Requests ({pendingRequests.length})
            </h4>
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">
                    {(req.requester?.full_name || req.requester?.email || '?')[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {req.requester?.full_name || req.requester?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{req.requester?.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => acceptRequest(req.id)}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="Accept"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Reject"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="border-b border-gray-100 my-2" />
          </div>
        )}

        {/* Friends List */}
        <div className="px-3 pb-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
            Friends ({friends.length})
          </h4>
          {loading ? (
            <div className="text-center py-4">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">No friends yet</p>
              <p className="text-xs text-gray-300 mt-0.5">Search for users above</p>
            </div>
          ) : (
            friends.map((f) => {
              const isOnline = f.friend.status === 'online';
              return (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(f.friend.full_name || f.friend.email)[0]?.toUpperCase()}
                      </span>
                    </div>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {f.friend.full_name || f.friend.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isOnline ? (
                        <span className="text-emerald-500">Online</span>
                      ) : (
                        `Last seen ${formatDistanceToNow(new Date(f.friend.last_seen), { addSuffix: true })}`
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartChat(f.friend.id)}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                    title="Send message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Chat Panel
// ═══════════════════════════════════════════
function ChatPanel({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
}) {
  const { messages, loading, send } = useMessages(conversation.id);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherParticipant = conversation.participants?.find((p) => p.user_id !== currentUserId);
  const otherUser = otherParticipant?.user;
  const displayName = conversation.name || otherUser?.full_name || otherUser?.email?.split('@')[0] || 'Chat';
  const isOnline = otherUser?.status === 'online';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await send(input);
    setInput('');
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">
            {isOnline ? (
              <span className="text-emerald-500">Online</span>
            ) : otherUser?.last_seen ? (
              `Last seen ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true })}`
            ) : (
              'Offline'
            )}
          </p>
        </div>

        <button className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-300 mt-1">Say hello!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isOwn = msg.sender_id === currentUserId;
              const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
              const isSystem = msg.message_type === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {showAvatar && !isOwn ? (
                      <div className="w-6 h-6 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-[9px] font-bold">
                          {(msg.sender?.full_name || msg.sender?.email || '?')[0]?.toUpperCase()}
                        </span>
                      </div>
                    ) : !isOwn ? (
                      <div className="w-6" />
                    ) : null}

                    {/* Bubble */}
                    <div
                      className={`px-3.5 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-emerald-500 text-white rounded-br-md'
                          : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                        <span className={`text-[10px] ${isOwn ? 'text-emerald-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        {msg.is_edited && (
                          <span className={`text-[10px] ${isOwn ? 'text-emerald-200' : 'text-gray-300'}`}>
                            (edited)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400">
            <Smile className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
            disabled={sending}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={`p-2.5 rounded-xl transition-colors ${
              input.trim()
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// Empty Chat State
// ═══════════════════════════════════════════
function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/30">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Messages</h3>
        <p className="text-sm text-gray-400 max-w-xs">
          Select a conversation to start chatting, or add friends and start a new chat.
        </p>
      </div>
    </div>
  );
}
