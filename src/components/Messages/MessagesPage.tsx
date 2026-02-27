import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
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
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  Play,
  Pause,
  Eye,
  Film,
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import toast from 'react-hot-toast';
import { useAppStore } from '../../store/appStore';
import { useConversations, useMessages } from '../../hooks/useMessaging';
import { MessageService } from '../../services/messageService';
import { useFollowersList, useFollowSearch } from '../../hooks/useFollow';
import { FriendService } from '../../services/friendService';
import type { Conversation, Message, UserProfile } from '../../types/database.types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

// ═══════════════════════════════════════════════════════
// Messages Page – Light theme matching app design system
// ═══════════════════════════════════════════════════════

export const MessagesPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const user = useAppStore((s) => s.user);
  const { conversations, loading: convsLoading, startDirectChat, refresh: refreshConversations } = useConversations();

  // Keep selectedConversation in sync with the enriched conversations list
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const enriched = conversations.find(c => c.id === selectedConversation.id);
      if (enriched) {
        setSelectedConversation(enriched);
      }
    }
  }, [conversations]);

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
    <div className="h-[calc(100vh-7rem)] flex bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Left Sidebar */}
      <div className={`w-full lg:w-[400px] border-r border-gray-200 flex flex-col bg-white ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[1.1rem] font-bold text-gray-900 tracking-tight">
              {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Messages'}
            </h1>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            title="New message"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 text-gray-900 border-0 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder:text-gray-400 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notes / Stories Row */}
        <NotesRow />

        {/* Messages / Requests Tabs */}
        <div className="flex items-center justify-between px-6 py-2">
          <span className="text-[15px] font-bold text-gray-900">Messages</span>
          <button className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
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
          searchQuery={searchQuery}
        />
      </div>

      {/* Right Panel */}
      <div className={`flex-1 flex flex-col bg-[#f8f9fb] ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
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

// ═══════════════════════════════════════════════════════
// Notes / Stories Row
// ═══════════════════════════════════════════════════════
function NotesRow() {
  const currentUser = useAppStore((s) => s.user);
  const { list: followingList } = useFollowersList(currentUser?.id || null, 'following');

  const yourName = currentUser?.user_metadata?.full_name?.split(' ')[0]
    || currentUser?.email?.split('@')[0]
    || 'You';

  return (
    <div className="px-4 py-2 border-b border-gray-100">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {/* Your Note */}
        <button className="flex flex-col items-center gap-1.5 shrink-0 group">
          <div className="relative">
            <div className="w-[68px] h-[68px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 group-hover:border-emerald-300 transition-colors">
              <span className="text-gray-700 text-xl font-bold">
                {yourName[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
              <span className="text-white text-[8px] font-bold leading-none">+</span>
            </div>
          </div>
          <span className="text-[11px] text-gray-500 font-medium max-w-16 truncate">
            Your note
          </span>
        </button>

        {/* Following users */}
        {followingList.slice(0, 12).map((f: typeof followingList[number]) => {
          const profile = (f as unknown as Record<string, unknown>).following as UserProfile | undefined;
          if (!profile) return null;
          const name = profile.full_name || profile.username || profile.email?.split('@')[0] || '?';
          const initial = name[0]?.toUpperCase() || '?';
          return (
            <button
              key={f.id}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-emerald-400 via-teal-500 to-blue-500">
                <div className="w-[64px] h-[64px] rounded-full bg-white p-[2px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">{initial}</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-gray-500 font-medium max-w-16 truncate group-hover:text-gray-700 transition-colors">
                {profile.username || name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Conversation List
// ═══════════════════════════════════════════════════════
function ConversationList({
  userId,
  conversations,
  loading,
  onSelect,
  selectedId,
  searchQuery,
}: {
  userId: string;
  conversations: Conversation[];
  loading: boolean;
  onSelect: (conv: Conversation) => void;
  selectedId: string | null;
  searchQuery: string;
}) {

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    const dist = formatDistanceToNow(d, { addSuffix: false });
    return dist;
  };

  // Filter conversations by search query
  const filtered = searchQuery.trim()
    ? conversations.filter((conv) => {
        const other = conv.participants?.find((p) => p.user_id !== userId);
        const otherUser = other?.user;
        const displayName = conv.name || otherUser?.full_name || otherUser?.username || otherUser?.email?.split('@')[0] || '';
        const lastContent = conv.last_message?.content || '';
        const q = searchQuery.toLowerCase();
        return displayName.toLowerCase().includes(q) || lastContent.toLowerCase().includes(q);
      })
    : conversations;

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-6">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500">{searchQuery ? 'No results found' : 'No messages yet'}</p>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery ? 'Try a different search term' : 'Tap the compose button to start chatting'}
          </p>
        </div>
      ) : (
        filtered.map((conv) => {
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
            if (lastMsg.message_type === 'image') preview = '📷 Photo';
            else if (lastMsg.message_type === 'video') preview = '🎥 Video';
            else if (lastMsg.message_type === 'voice') preview = '🎙️ Voice message';
            else if (lastMsg.message_type === 'system') preview = lastMsg.content;
            else preview = lastMsg.content;
          }

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-left transition-all ${
                isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {displayName[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                {otherUser?.status === 'online' && (
                  <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-700'}`}>
                  {displayName}
                </p>
                <div className="flex items-center gap-1">
                  <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {previewPrefix}{preview}
                  </p>
                  {lastMsg && (
                    <span className={`text-sm shrink-0 ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      &middot; {formatTime(lastMsg.created_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Unread dot */}
              {hasUnread && (
                <div className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Chat Panel
// ═══════════════════════════════════════════════════════
function ChatPanel({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
}) {
  const { messages, loading, send, sendMedia, markRead } = useMessages(conversation.id);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'voice' | null>(null);
  const [viewMessage, setViewMessage] = useState<Message | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (conversation.id && messages.length > 0) {
      markRead();
    }
  }, [conversation.id, messages.length, markRead]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setSending(true);
    setShowEmojiPicker(false);
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

  const handleEmojiSelect = (emoji: { native: string }) => {
    setInput((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  // ─── Image Upload ───
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadType('image');
    try {
      const result = await sendMedia(file, 'image', {
        filename: file.name,
        onProgress: (p) => setUploadProgress(p),
      });
      if (!result) toast.error('Failed to send image');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      setUploadType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Video Upload ───
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB');
      return;
    }
    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadType('video');
    try {
      const duration = await getMediaDuration(file);
      const result = await sendMedia(file, 'video', {
        filename: file.name,
        duration,
        onProgress: (p) => setUploadProgress(p),
      });
      if (!result) toast.error('Failed to send video');
    } catch {
      toast.error('Failed to upload video');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      setUploadType(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // ─── Voice Recording ───
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast.error('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          toast.error('Recording too short');
          resolve();
          return;
        }

        setUploadingMedia(true);
        setUploadProgress(0);
        setUploadType('voice');
        try {
          const duration = recordingTime;
          const result = await sendMedia(blob, 'voice', {
            duration,
            onProgress: (p) => setUploadProgress(p),
          });
          if (!result) toast.error('Failed to send voice message');
        } catch {
          toast.error('Failed to upload voice message');
        } finally {
          setUploadingMedia(false);
          setUploadProgress(0);
          setUploadType(null);
          setRecordingTime(0);
        }

        // Stop all tracks
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
      recorder.stop();
    });
  }, [sendMedia, recordingTime]);

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // ─── Voice Playback ───
  const toggleVoicePlayback = (msgId: string, url: string) => {
    if (playingVoice === msgId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setPlayingVoice(msgId);
    audio.onended = () => setPlayingVoice(null);
  };

  // ─── Send Heart ───
  const handleSendHeart = async () => {
    setSending(true);
    try {
      await send('❤️');
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const formatRecordingTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDuration = (s?: number) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getReadStatus = (msg: Message): 'sent' | 'delivered' | 'read' => {
    if (msg.sender_id !== currentUserId) return 'read';
    const readBy = msg.read_by || {};
    const otherReaders = Object.keys(readBy).filter((k) => k !== currentUserId);
    if (otherReaders.length > 0) return 'read';
    const deliveredTo = msg.delivered_to || {};
    const otherDelivered = Object.keys(deliveredTo).filter((k) => k !== currentUserId);
    if (otherDelivered.length > 0) return 'delivered';
    return 'sent';
  };

  const groupedMessages = groupMessagesByDate(messages);

  // ─── Render a message bubble based on type ───
  const renderMessageContent = (msg: Message, isOwn: boolean) => {
    switch (msg.message_type) {
      case 'image':
        return (
          <div
            className="cursor-pointer relative group/img"
            onClick={() => setViewMessage(msg)}
          >
            <img
              src={msg.media_thumbnail || msg.media_url}
              alt="Shared image"
              className="max-w-[260px] max-h-[300px] rounded-xl object-cover"
              loading="lazy"
              onLoad={(e) => {
                // Swap to full-res once thumbnail loads
                if (msg.media_thumbnail && msg.media_url) {
                  const fullImg = new Image();
                  fullImg.src = msg.media_url;
                  fullImg.onload = () => {
                    (e.target as HTMLImageElement).src = msg.media_url!;
                  };
                }
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 rounded-xl transition-colors flex items-center justify-center">
              <Eye className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      case 'video':
        return (
          <div
            className="cursor-pointer relative group/vid"
            onClick={() => setViewMessage(msg)}
          >
            <div className="w-[260px] h-[180px] bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden">
              {msg.media_thumbnail ? (
                <img
                  src={msg.media_thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              ) : (
                <video
                  src={msg.media_url}
                  className="w-full h-full object-cover rounded-xl"
                  preload="metadata"
                />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
                </div>
              </div>
              {msg.media_duration && (
                <span className="absolute bottom-2 right-2 text-[11px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                  {formatDuration(msg.media_duration)}
                </span>
              )}
            </div>
          </div>
        );
      case 'voice':
        return (
          <div className={`flex items-center gap-3 min-w-[200px] px-4 py-2.5 ${isOwn ? 'bg-emerald-500' : 'bg-white border border-gray-200'} rounded-[22px]`}>
            <button
              onClick={() => msg.media_url && toggleVoicePlayback(msg.id, msg.media_url)}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
              } transition-colors`}
            >
              {playingVoice === msg.id ? (
                <Pause className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-gray-700'}`} fill="currentColor" />
              ) : (
                <Play className={`w-4 h-4 ml-0.5 ${isOwn ? 'text-white' : 'text-gray-700'}`} fill="currentColor" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[3px] rounded-full ${isOwn ? 'bg-white/50' : 'bg-gray-300'}`}
                    style={{ height: `${Math.random() * 16 + 4}px` }}
                  />
                ))}
              </div>
            </div>
            <span className={`text-[11px] shrink-0 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
              {formatDuration(msg.media_duration)}
            </span>
          </div>
        );
      default:
        return (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
        );
    }
  };

  return (
    <>
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate">{displayName}</p>
          <p className="text-[12px] text-gray-500 truncate">{username}</p>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#f8f9fb]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-5">
              <span className="text-white text-3xl font-bold">
                {displayName[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">{displayName}</p>
            <p className="text-sm text-gray-500 mb-1">{username}</p>
            <p className="text-sm text-gray-400 mb-5">Start a conversation</p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-5">
                  <span className="text-[12px] text-gray-400 font-medium bg-white/80 px-3 py-1 rounded-full shadow-sm">
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
                  const isMedia = msg.message_type === 'image' || msg.message_type === 'video' || msg.message_type === 'voice';
                  const readStatus = getReadStatus(msg);

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center py-3">
                        <span className="text-[12px] text-gray-500 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
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
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 mb-0.5">
                            <span className="text-white text-[10px] font-bold">
                              {(msg.sender?.full_name || msg.sender?.email || '?')[0]?.toUpperCase()}
                            </span>
                          </div>
                        ) : !isOwn ? (
                          <div className="w-7" />
                        ) : null}

                        <div className="relative">
                          {isMedia && msg.message_type !== 'voice' ? (
                            renderMessageContent(msg, isOwn)
                          ) : msg.message_type === 'voice' ? (
                            renderMessageContent(msg, isOwn)
                          ) : (
                            <div
                              className={`relative px-4 py-2.5 ${
                                isOwn
                                  ? `bg-emerald-500 text-white ${isLastInGroup ? 'rounded-[22px] rounded-br-[4px]' : 'rounded-[22px]'}`
                                  : `bg-white text-gray-900 border border-gray-200 shadow-sm ${isLastInGroup ? 'rounded-[22px] rounded-bl-[4px]' : 'rounded-[22px]'}`
                              }`}
                            >
                              {renderMessageContent(msg, isOwn)}
                            </div>
                          )}

                          {/* Hover actions */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity ${
                              isHovered ? 'opacity-100' : 'opacity-0'
                            } ${isOwn ? 'right-full mr-1' : 'left-full ml-1'}`}
                          >
                            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-400" title="React">
                              <Smile className="w-4 h-4" />
                            </button>
                            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-400" title="Reply">
                              <CornerUpLeft className="w-4 h-4" />
                            </button>
                            {(msg.message_type === 'image' || msg.message_type === 'video') && (
                              <button
                                onClick={() => setViewMessage(msg)}
                                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {isOwn && (
                              <button
                                onClick={async () => {
                                  try {
                                    await MessageService.deleteMessage(conversation.id, msg.id);
                                    toast.success('Message deleted');
                                  } catch { toast.error('Failed to delete'); }
                                }}
                                className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Timestamp + read receipts */}
                          {isLastInGroup && (
                            <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : ''}`}>
                              <span className="text-[11px] text-gray-400">
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                              {isOwn && (
                                readStatus === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                                ) : readStatus === 'delivered' ? (
                                  <CheckCheck className="w-3 h-3 text-gray-400" />
                                ) : (
                                  <Check className="w-3 h-3 text-gray-400" />
                                )
                              )}
                              {msg.is_edited && <span className="text-[11px] text-gray-400">&middot; edited</span>}
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

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />

      {/* Message Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 relative">
        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              ref={emojiPickerRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-4 mb-2 z-50"
            >
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="light"
                previewPosition="none"
                skinTonePosition="search"
                maxFrequentRows={2}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload progress */}
        {uploadingMedia && (
          <div className="flex items-center gap-3 px-4 py-2.5 mb-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="shrink-0">
              {uploadType === 'image' ? <ImageIcon className="w-5 h-5 text-emerald-500" /> :
               uploadType === 'video' ? <Film className="w-5 h-5 text-emerald-500" /> :
               <Mic className="w-5 h-5 text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">
                  {uploadProgress < 100
                    ? `Uploading ${uploadType}...`
                    : 'Processing...'}
                </span>
                <span className="text-xs font-medium text-emerald-600">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recording UI */}
        {isRecording ? (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[22px] px-4 py-3">
            <button
              onClick={cancelRecording}
              className="p-1.5 text-red-500 hover:text-red-600 transition-colors"
              title="Cancel"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-gray-900 text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
              <div className="flex items-center gap-0.5 flex-1">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-red-400/60 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 4}px`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={stopRecording}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white transition-colors"
              title="Send voice message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2 bg-gray-100 border border-gray-200 rounded-[22px] px-4 py-1.5">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-1.5 transition-colors shrink-0 mb-0.5 ${showEmojiPicker ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Smile className="w-6 h-6" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              className="flex-1 py-2 text-[15px] bg-transparent text-gray-900 outline-none placeholder:text-gray-400 resize-none max-h-[120px] leading-snug"
              disabled={sending || uploadingMedia}
            />

            {input.trim() ? (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={sending}
                className="text-emerald-600 font-bold text-[15px] hover:text-emerald-700 transition-colors shrink-0 mb-0.5 px-1"
              >
                Send
              </motion.button>
            ) : (
              <div className="flex items-center gap-0.5 shrink-0 mb-0.5">
                <button
                  onClick={startRecording}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Voice message"
                >
                  <Mic className="w-6 h-6" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Send photo"
                  disabled={uploadingMedia}
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Send video"
                  disabled={uploadingMedia}
                >
                  <Film className="w-6 h-6" />
                </button>
                <button
                  onClick={handleSendHeart}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  title="Send heart"
                  disabled={sending}
                >
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Message Modal (for images/videos) */}
      <AnimatePresence>
        {viewMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewMessage(null)}
          >
            <button
              onClick={() => setViewMessage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[85vh] relative"
            >
              {viewMessage.message_type === 'image' ? (
                <img
                  src={viewMessage.media_url}
                  alt="Full size"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              ) : viewMessage.message_type === 'video' ? (
                <video
                  src={viewMessage.media_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[85vh] rounded-lg"
                />
              ) : null}

              {/* Message info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80">
                    {viewMessage.sender?.full_name || 'Unknown'}
                  </span>
                  <span className="text-xs text-white/50">
                    {format(new Date(viewMessage.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Empty Chat State
// ═══════════════════════════════════════════════════════
function EmptyChat({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full border-[3px] border-gray-300 flex items-center justify-center mx-auto mb-5">
          <Send className="w-10 h-10 text-gray-400 -rotate-45" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">Your Messages</h3>
        <p className="text-sm text-gray-500 max-w-[260px] mx-auto mb-5">
          Send a message to start a chat.
        </p>
        <button
          onClick={onCompose}
          className="px-6 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
        >
          Send message
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// New Message Modal
// ═══════════════════════════════════════════════════════
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
      console.log('[NewMessageModal] Starting chat with user:', userId);
      const conv = await startDirectChat(userId);
      if (conv) {
        console.log('[NewMessageModal] Conversation created:', conv.id);
        onStartChat(conv);
      } else {
        console.error('[NewMessageModal] startDirectChat returned null');
        toast.error('Could not start conversation. Please try again.');
      }
    } catch (err) {
      console.error('[NewMessageModal] Start chat error:', err);
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-gray-900">New message</h2>
          <div className="w-7" />
        </div>

        {/* To: search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-semibold text-gray-900">To:</span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-[15px] bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.length >= 2 ? (
            <div className="py-2">
              {searching ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <p className="text-sm text-gray-500">No account found.</p>
                  <p className="text-xs text-gray-400 mt-1">Try searching by username, name, or email</p>
                </div>
              ) : (
                searchResults.map((u) => {
                  if (!u || !u.id) return null;
                  const name = u.full_name || u.username || u.email?.split('@')[0] || 'Unknown';
                  const initial = name[0]?.toUpperCase() || '?';
                  const uname = u.username ? `@${u.username}` : (u.email || 'No email');
                  const isSelected = selectedUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleSelect(u.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-bold">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-500 truncate">{uname}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
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
              <p className="px-5 py-2 text-sm font-bold text-gray-900">Suggested</p>
              {followingList.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <p className="text-sm text-gray-500">No suggestions available</p>
                  <p className="text-xs text-gray-400 mt-1">Follow people to start messaging</p>
                </div>
              ) : (
                followingList.map((f) => {
                  const profile = (f as unknown as Record<string, unknown>).following as UserProfile | undefined;
                  if (!profile || !profile.id) return null;
                  const name = profile.full_name || profile.username || profile.email?.split('@')[0] || 'Unknown';
                  const initial = name[0]?.toUpperCase() || '?';
                  const uname = profile.username ? `@${profile.username}` : (profile.email || 'No email');
                  const isSelected = selectedUserId === profile.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleSelect(profile.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-bold">{initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-500 truncate">{uname}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
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
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={() => selectedUserId && handleStartChat(selectedUserId)}
            disabled={!selectedUserId || starting}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            Chat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════

function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

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
