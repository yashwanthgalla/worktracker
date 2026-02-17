import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
  Users,
  MessageSquare,
  X,
  Smile,
  ChevronLeft,
  Edit3,
  Heart,
  Phone,
  Video,
  Info,
  Mic,
  Image as ImageIcon,
  CornerUpLeft,
  CheckCheck,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../store/appStore';
import { useConversations, useMessages } from '../../hooks/useMessaging';
import { useFollowersList, useFollowSearch } from '../../hooks/useFollow';
import { FriendService } from '../../services/friendService';
import type { Conversation, Message, UserProfile } from '../../types/database.types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

// 
// Instagram-style Dark-Theme Messages Page
// 

export const MessagesPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const user = useAppStore((s) => s.user);
  const { conversations, loading: convsLoading, startDirectChat, refresh: refreshConversations } = useConversations();

  useEffect(() => {
    FriendService.ensureProfile();
    FriendService.updateOnlineStatus('online');
    const handleBeforeUnload = () => FriendService.updateOnlineStatus('offline');
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
    <div className="h-[calc(100vh-7rem)] flex bg-black rounded-2xl overflow-hidden border border-[#363636]">
      {/* Left Sidebar */}
      <div className={`w-full lg:w-[400px] border-r border-[#363636] flex flex-col bg-black ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[1.1rem] font-bold text-white tracking-tight">
              {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Messages'}
            </h1>
            <ChevronDown className="w-3.5 h-3.5 text-white" />
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            title="New message"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a8a8]" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#363636] text-white border-0 rounded-lg focus:ring-1 focus:ring-[#555] focus:outline-none placeholder:text-[#a8a8a8] transition-colors"
            />
          </div>
        </div>

        {/* Notes / Stories Row */}
        <NotesRow />

        {/* Messages / Requests Tabs */}
        <div className="flex items-center justify-between px-6 py-2">
          <span className="text-[15px] font-bold text-white">Messages</span>
          <button className="text-sm font-semibold text-[#a8a8a8] hover:text-white transition-colors">
            Requests
          </button>
        </div>

        {/* Conversation List */}
        <ConversationList
          userId={user?.id || ''}
          conversations={conversations}
          loading={convsLoading}
          onSelect={handleSelectConversation}
          selectedId={selectedConversation?.id || null}
        />
      </div>

      {/* Right Panel */}
      <div className={`flex-1 flex flex-col bg-black ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
        {selectedConversation ? (
          <ChatPanel
            conversation={selectedConversation}
            currentUserId={user?.id || ''}
            onBack={handleBack}
          />
        ) : (
          <EmptyChat onCompose={() => setShowNewMessage(true)} />
        )}
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessage && (
          <NewMessageModal
            onClose={() => setShowNewMessage(false)}
            startDirectChat={startDirectChat}
            onStartChat={(conv) => {
              // Find the enriched version from the shared conversations list
              const enriched = conversations.find(c => c.id === conv.id);
              setSelectedConversation(enriched || conv);
              setShowMobileChat(true);
              setShowNewMessage(false);
              // Refresh to make sure sidebar is up to date
              refreshConversations();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// 
// Notes / Stories Row
// 
function NotesRow() {
  const currentUser = useAppStore((s) => s.user);
  const { list: followingList } = useFollowersList(currentUser?.id || null, 'following');

  const yourName = currentUser?.user_metadata?.full_name?.split(' ')[0]
    || currentUser?.email?.split('@')[0]
    || 'You';

  return (
    <div className="px-4 py-2 border-b border-[#363636]">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {/* Your Note */}
        <button className="flex flex-col items-center gap-1.5 shrink-0 group">
          <div className="relative">
            <div className="w-[68px] h-[68px] rounded-full bg-[#262626] flex items-center justify-center border-2 border-[#363636] group-hover:border-[#555] transition-colors">
              <span className="text-white text-xl font-bold">
                {yourName[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-[#0095F6] rounded-full w-4 h-4 flex items-center justify-center border-2 border-black">
              <span className="text-white text-[8px] font-bold leading-none">+</span>
            </div>
          </div>
          <span className="text-[11px] text-[#a8a8a8] font-medium max-w-16 truncate">
            Your note
          </span>
        </button>

        {/* Following users */}
        {followingList.slice(0, 12).map((f) => {
          const profile = (f as Record<string, unknown>).following as UserProfile | undefined;
          if (!profile) return null;
          const name = profile.full_name || profile.username || profile.email?.split('@')[0] || '?';
          const initial = name[0]?.toUpperCase() || '?';
          return (
            <button
              key={f.id}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                <div className="w-[64px] h-[64px] rounded-full bg-black p-[2px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">{initial}</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#a8a8a8] font-medium max-w-16 truncate group-hover:text-white transition-colors">
                {profile.username || name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 
// Conversation List
// 
function ConversationList({
  userId,
  conversations,
  loading,
  onSelect,
  selectedId,
}: {
  userId: string;
  conversations: Conversation[];
  loading: boolean;
  onSelect: (conv: Conversation) => void;
  selectedId: string | null;
}) {

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    const dist = formatDistanceToNow(d, { addSuffix: false });
    return dist;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#0095F6]" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 px-6">
          <MessageSquare className="w-12 h-12 text-[#363636] mx-auto mb-4" />
          <p className="text-sm font-medium text-[#a8a8a8]">No messages yet</p>
          <p className="text-xs text-[#555] mt-1">
            Tap the compose button to start chatting
          </p>
        </div>
      ) : (
        conversations.map((conv) => {
          const other = conv.participants?.find((p) => p.user_id !== userId);
          const otherUser = other?.user;
          const displayName = conv.name || otherUser?.full_name || otherUser?.username || otherUser?.email?.split('@')[0] || 'Unknown';
          const isSelected = selectedId === conv.id;
          const hasUnread = (conv.unread_count || 0) > 0;
          const lastMsg = conv.last_message;

          let preview = 'No messages yet';
          let previewPrefix = '';
          if (lastMsg) {
            if (lastMsg.sender_id === userId) previewPrefix = 'You: ';
            if (lastMsg.message_type === 'image') preview = 'sent an attachment.';
            else if (lastMsg.message_type === 'system') preview = lastMsg.content;
            else preview = lastMsg.content;
          }

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-left transition-all ${
                isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#121212]'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {displayName[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                {otherUser?.status === 'online' && (
                  <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#44b700] rounded-full border-[3px] border-black" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] truncate ${hasUnread ? 'font-bold text-white' : 'font-normal text-[#f5f5f5]'}`}>
                  {displayName}
                </p>
                <div className="flex items-center gap-1">
                  <p className={`text-sm truncate ${hasUnread ? 'text-white font-medium' : 'text-[#a8a8a8]'}`}>
                    {previewPrefix}{preview}
                  </p>
                  {lastMsg && (
                    <span className={`text-sm shrink-0 ${hasUnread ? 'text-white font-medium' : 'text-[#a8a8a8]'}`}>
                      &middot; {formatTime(lastMsg.created_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Unread dot */}
              {hasUnread && (
                <div className="shrink-0 w-2 h-2 bg-[#0095F6] rounded-full" />
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

// 
// Chat Panel
// 
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
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const otherParticipant = conversation.participants?.find((p) => p.user_id !== currentUserId);
  const otherUser = otherParticipant?.user;
  const displayName = conversation.name || otherUser?.full_name || otherUser?.email?.split('@')[0] || 'Chat';
  const username = otherUser?.username ? `@${otherUser.username}` : otherUser?.email?.split('@')[0] || '';
  const isOnline = otherUser?.status === 'online';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setSending(true);
    try {
      const result = await send(content);
      if (!result) {
        toast.error('Message could not be delivered. Check browser console (F12) for details.');
        setInput(content);
      }
    } catch (err) {
      console.error('[ChatPanel] Unexpected send error:', err);
      toast.error('An unexpected error occurred while sending.');
      setInput(content);
    } finally {
      setSending(false);
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <>
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#363636] bg-black">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#44b700] rounded-full border-2 border-black" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white truncate">{displayName}</p>
          <p className="text-[12px] text-[#a8a8a8] truncate">{username}</p>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-black">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#0095F6]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-5">
              <span className="text-white text-3xl font-bold">
                {displayName[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <p className="text-xl font-bold text-white mb-1">{displayName}</p>
            <p className="text-sm text-[#a8a8a8] mb-1">{username}</p>
            <p className="text-sm text-[#555] mb-5">Start a conversation</p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-5">
                  <span className="text-[12px] text-[#a8a8a8] font-medium">
                    {group.label}
                  </span>
                </div>

                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === currentUserId;
                  const prevMsg = i > 0 ? group.messages[i - 1] : null;
                  const nextMsg = i < group.messages.length - 1 ? group.messages[i + 1] : null;
                  const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                  const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                  const isSystem = msg.message_type === 'system';
                  const isHovered = hoveredMsg === msg.id;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center py-3">
                        <span className="text-[12px] text-[#a8a8a8] bg-[#262626] px-4 py-1.5 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-[2px]'}`}
                      onMouseEnter={() => setHoveredMsg(msg.id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      <div className={`group flex items-end gap-2 max-w-[65%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        {!isOwn && showAvatar ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mb-0.5">
                            <span className="text-white text-[10px] font-bold">
                              {(msg.sender?.full_name || msg.sender?.email || '?')[0]?.toUpperCase()}
                            </span>
                          </div>
                        ) : !isOwn ? (
                          <div className="w-7" />
                        ) : null}

                        <div className="relative">
                          <div
                            className={`relative px-4 py-2.5 ${
                              isOwn
                                ? `bg-[#3797F0] text-white ${isLastInGroup ? 'rounded-[22px] rounded-br-[4px]' : 'rounded-[22px]'}`
                                : `bg-[#262626] text-[#f5f5f5] ${isLastInGroup ? 'rounded-[22px] rounded-bl-[4px]' : 'rounded-[22px]'}`
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>

                          {/* Hover actions */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity ${
                              isHovered ? 'opacity-100' : 'opacity-0'
                            } ${isOwn ? 'right-full mr-1' : 'left-full ml-1'}`}
                          >
                            <button className="p-1 rounded-full hover:bg-white/10 text-[#a8a8a8]" title="React">
                              <Smile className="w-4 h-4" />
                            </button>
                            <button className="p-1 rounded-full hover:bg-white/10 text-[#a8a8a8]" title="Reply">
                              <CornerUpLeft className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Timestamp */}
                          {isLastInGroup && (
                            <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : ''}`}>
                              <span className="text-[11px] text-[#555]">
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                              {isOwn && <CheckCheck className="w-3 h-3 text-[#555]" />}
                              {msg.is_edited && <span className="text-[11px] text-[#555]">&middot; edited</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="px-4 py-3 bg-black border-t border-[#363636]">
        <div className="flex items-end gap-2 bg-[#262626] border border-[#363636] rounded-[22px] px-4 py-1.5">
          <button className="p-1.5 text-[#a8a8a8] hover:text-white transition-colors shrink-0 mb-0.5">
            <Smile className="w-6 h-6" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 py-2 text-[15px] bg-transparent text-white outline-none placeholder:text-[#a8a8a8] resize-none max-h-[120px] leading-snug"
            disabled={sending}
          />

          {input.trim() ? (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={sending}
              className="text-[#0095F6] font-bold text-[15px] hover:text-white transition-colors shrink-0 mb-0.5 px-1"
            >
              Send
            </motion.button>
          ) : (
            <div className="flex items-center gap-0.5 shrink-0 mb-0.5">
              <button className="p-1.5 text-[#a8a8a8] hover:text-white transition-colors">
                <Mic className="w-6 h-6" />
              </button>
              <button className="p-1.5 text-[#a8a8a8] hover:text-white transition-colors">
                <ImageIcon className="w-6 h-6" />
              </button>
              <button className="p-1.5 text-[#a8a8a8] hover:text-white transition-colors">
                <Heart className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// 
// Empty Chat State
// 
function EmptyChat({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full border-[3px] border-white flex items-center justify-center mx-auto mb-5">
          <Send className="w-10 h-10 text-white -rotate-45" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">Your Messages</h3>
        <p className="text-sm text-[#a8a8a8] max-w-[260px] mx-auto mb-5">
          Send a message to start a chat.
        </p>
        <button
          onClick={onCompose}
          className="px-6 py-2.5 rounded-lg bg-[#0095F6] text-white text-sm font-semibold hover:bg-[#1877F2] transition-colors"
        >
          Send message
        </button>
      </div>
    </div>
  );
}

// 
// New Message Modal
// 
function NewMessageModal({
  onClose,
  onStartChat,
  startDirectChat,
}: {
  onClose: () => void;
  onStartChat: (conv: Conversation) => void;
  startDirectChat: (otherUserId: string) => Promise<Conversation | null>;
}) {
  const currentUser = useAppStore((s) => s.user);
  const { results: searchResults, search: searchUsersForFollow } = useFollowSearch();
  const { list: followingList } = useFollowersList(currentUser?.id || null, 'following');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedUserId(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) return;
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await searchUsersForFollow(query);
      setSearching(false);
    }, 400);
  };

  const handleStartChat = async (userId: string) => {
    setStarting(true);
    try {
      const conv = await startDirectChat(userId);
      if (conv) {
        onStartChat(conv);
      } else {
        toast.error('Could not start conversation. Please try again.');
      }
    } catch (err) {
      console.error('Start chat error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const toggleSelect = (userId: string) => {
    setSelectedUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#262626] rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden border border-[#363636]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#363636]">
          <button onClick={onClose} className="p-1 text-white">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-white">New message</h2>
          <div className="w-7" />
        </div>

        {/* To: search */}
        <div className="px-5 py-3 border-b border-[#363636]">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-semibold text-white">To:</span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-[15px] bg-transparent text-white outline-none placeholder:text-[#a8a8a8]"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.length >= 2 ? (
            <div className="py-2">
              {searching ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0095F6]" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <p className="text-sm text-[#a8a8a8]">No account found.</p>
                </div>
              ) : (
                searchResults.map((u) => {
                  const name = u.full_name || u.email.split('@')[0];
                  const initial = name[0]?.toUpperCase() || '?';
                  const uname = u.username ? `@${u.username}` : u.email;
                  const isSelected = selectedUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleSelect(u.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#1a1a1a] cursor-pointer ${
                        isSelected ? 'bg-[#1a1a1a]' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-bold">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-[#a8a8a8] truncate">{uname}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#0095F6] border-[#0095F6]' : 'border-[#a8a8a8]'
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="py-2">
              <p className="px-5 py-2 text-sm font-bold text-white">Suggested</p>
              {followingList.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <p className="text-sm text-[#a8a8a8]">No suggestions available</p>
                  <p className="text-xs text-[#555] mt-1">Follow people to start messaging</p>
                </div>
              ) : (
                followingList.map((f) => {
                  const profile = (f as Record<string, unknown>).following as UserProfile | undefined;
                  if (!profile) return null;
                  const name = profile.full_name || profile.username || profile.email?.split('@')[0] || '?';
                  const initial = name[0]?.toUpperCase() || '?';
                  const uname = profile.username ? `@${profile.username}` : profile.email || '';
                  const isSelected = selectedUserId === profile.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleSelect(profile.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#1a1a1a] transition-colors ${
                        isSelected ? 'bg-[#1a1a1a]' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-bold">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-[#a8a8a8] truncate">{uname}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#0095F6] border-[#0095F6]' : 'border-[#a8a8a8]'
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Chat button */}
        <div className="px-5 py-4 border-t border-[#363636]">
          <button
            onClick={() => selectedUserId && handleStartChat(selectedUserId)}
            disabled={!selectedUserId || starting}
            className="w-full py-3 rounded-lg bg-[#0095F6] text-white font-bold text-sm hover:bg-[#1877F2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            Chat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 
// Utilities
// 

function groupMessagesByDate(messages: Message[]): { date: string; label: string; messages: Message[] }[] {
  const groups: { date: string; label: string; messages: Message[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const dateKey = format(d, 'yyyy-MM-dd');

    if (dateKey !== currentDate) {
      currentDate = dateKey;
      let label: string;
      if (isToday(d)) label = 'Today';
      else if (isYesterday(d)) label = 'Yesterday';
      else label = format(d, 'MMMM d, yyyy');
      groups.push({ date: dateKey, label, messages: [] });
    }

    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}
