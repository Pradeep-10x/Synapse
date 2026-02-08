import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messageAPI, communityAPI, communityChatAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Send, Phone, Video, Loader2, Users, MessageCircle, X, PhoneOff, Crown, Shield, Search, Paperclip, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
    fullName?: string;
  };
  receiver: string;
  conversation: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    avatar?: string;
  }>;
  lastMessage?: string;
  updatedAt: string;
}

interface CommunityChat {
  _id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  lastMessage?: string;
  updatedAt: string;
}

function formatListTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { socket, onlineUsers, clearMessagesCount } = useSocketStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const communityId = searchParams.get('communityId');
  const {
    isCallActive,
    isCallIncoming,
    callType,
    callerId,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    endCall,
    rejectCall
  } = useWebRTC();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communityChats, setCommunityChats] = useState<CommunityChat[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedCommunityChat, setSelectedCommunityChat] = useState<CommunityChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'community'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [communityDetails, setCommunityDetails] = useState<any>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const selectedCommunityChatRef = useRef<CommunityChat | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Keep refs in sync with state for socket callbacks
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    selectedCommunityChatRef.current = selectedCommunityChat;
  }, [selectedCommunityChat]);

  // Listen for new messages from global socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === message.conversation) {
        setMessages((prev) => [...prev, message]);
      }
      // Update conversation list
      updateConversationLastMessage(message.conversation, message.content);
    };

    const handleCommunityMessage = (message: any) => {
      console.log('Received community message:', message);
      const currentCommunityChat = selectedCommunityChatRef.current;
      const messageCommunityId = message.community?._id || message.community;

      if (currentCommunityChat?._id === messageCommunityId) {
        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          if (prev.some(m => m._id === message._id)) {
            return prev;
          }
          return [...prev, {
            _id: message._id,
            content: message.content,
            sender: message.sender,
            conversation: messageCommunityId,
            receiver: '',
            createdAt: message.createdAt
          }];
        });
        scrollToBottom();
      }
      // Update community chat last message (use functional update to prevent unnecessary re-renders)
      setCommunityChats((prev) => {
        const updated = prev.map((chat) =>
          chat._id === messageCommunityId
            ? { ...chat, lastMessage: message.content, updatedAt: message.createdAt }
            : chat
        );
        // Only update if something actually changed to prevent unnecessary re-renders
        const changed = prev.some((chat, idx) =>
          chat._id === messageCommunityId &&
          (chat.lastMessage !== updated[idx].lastMessage || chat.updatedAt !== updated[idx].updatedAt)
        );
        return changed ? updated : prev;
      });
    };

    const handleTyping = (data: { conversationId: string; isTyping: boolean }) => {
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === data.conversationId) {
        setTyping(data.isTyping);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('community:message:new', handleCommunityMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('community:message:new', handleCommunityMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket]);

  useEffect(() => {
    fetchConversations();
    fetchCommunityChats();
    // Clear unread messages count when opening messages page
    clearMessagesCount();
  }, []);

  // Handle community chat from URL param - only run when communityId changes, not when communityChats updates
  useEffect(() => {
    if (communityId && communityChats.length > 0) {
      const communityChat = communityChats.find(c => c._id === communityId);
      if (communityChat && selectedCommunityChat?._id !== communityChat._id) {
        setActiveTab('community');
        setSelectedCommunityChat(communityChat);
        setSelectedConversation(null);
        fetchCommunityMessages(communityChat._id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, communityChats.length]); // Only depend on length, not the array itself

  const fetchCommunityChats = async () => {
    try {
      const response = await communityAPI.getJoined();
      const joinedCommunities = response.data.data || [];
      const chats: CommunityChat[] = joinedCommunities.map((c: any) => ({
        _id: c._id,
        name: c.name,
        avatar: c.avatar,
        memberCount: c.membersCount || 0,
        lastMessage: undefined,
        updatedAt: c.updatedAt || new Date().toISOString()
      }));
      setCommunityChats(chats);
    } catch (error) {
      console.error('Failed to fetch community chats:', error);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await messageAPI.getConversations();
      setConversations(response.data.data || []);
      // Don't auto-select any conversation
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await messageAPI.getMessages(conversationId);
      setMessages(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const updateConversationLastMessage = (conversationId: string, lastMessage: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId
          ? { ...conv, lastMessage, updatedAt: new Date().toISOString() }
          : conv
      )
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    // Handle community chat message
    if (selectedCommunityChat) {
      setSending(true);
      try {
        console.log('Sending community message:', selectedCommunityChat._id, messageInput.trim());
        const response = await communityChatAPI.sendMessage(
          selectedCommunityChat._id,
          messageInput.trim()
        );

        console.log('Community message response:', response.data);

        if (response.data?.data) {
          const newMessage = response.data.data;
          // Optimistically add message to UI (WebSocket will also send it)
          setMessages((prev) => {
            // Check if message already exists (might be added via WebSocket)
            if (prev.some(m => m._id === newMessage._id)) {
              return prev;
            }
            return [...prev, {
              _id: newMessage._id,
              content: newMessage.content,
              sender: newMessage.sender,
              conversation: newMessage.community || selectedCommunityChat._id,
              receiver: '',
              createdAt: newMessage.createdAt
            }];
          });
          setMessageInput('');
          scrollToBottom();
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        console.error('Failed to send community message:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send message. Please try again.';
        toast.error(errorMessage);
      } finally {
        setSending(false);
      }
      return;
    }

    // Handle direct message
    if (!selectedConversation) return;

    const receiverId = selectedConversation.participants.find(
      (p) => p._id !== user._id
    )?._id;

    if (!receiverId) return;

    setSending(true);
    try {
      const response = await messageAPI.sendMessage({
        receiverId,
        content: messageInput.trim(),
      });

      if (response.data?.data) {
        const newMessage = response.data.data;
        setMessages((prev) => [...prev, newMessage]);
        updateConversationLastMessage(selectedConversation._id, messageInput.trim());
        setMessageInput('');
        scrollToBottom();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error?.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !socket) return;

    socket.emit('typing', {
      conversationId: selectedConversation._id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing', {
        conversationId: selectedConversation._id,
        isTyping: false,
      });
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p._id !== user?._id);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedCommunityChat(null);
  };

  const fetchCommunityMessages = async (communityId: string) => {
    try {
      console.log('Fetching community messages for:', communityId);
      const response = await communityChatAPI.getMessages(communityId);
      const messagesData = response.data.data?.messages || [];
      console.log('Fetched messages:', messagesData.length);
      // Transform to match Message interface
      const transformedMessages: Message[] = messagesData.map((msg: any) => ({
        _id: msg._id,
        content: msg.content,
        sender: msg.sender,
        conversation: msg.community || communityId,
        receiver: '',
        createdAt: msg.createdAt
      }));
      setMessages(transformedMessages);
      // Scroll to bottom after loading messages
      setTimeout(() => scrollToBottom(), 100);
    } catch (error: any) {
      console.error('Failed to fetch community messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSelectCommunityChat = (chat: CommunityChat) => {
    setSelectedCommunityChat(chat);
    setSelectedConversation(null);
    setActiveTab('community');
    // Update URL to include communityId
    setSearchParams({ communityId: chat._id });
    fetchCommunityMessages(chat._id);
  };

  const handleShowMembers = async () => {
    if (!selectedCommunityChat) return;
    setShowMembersModal(true);
    setLoadingMembers(true);
    try {
      const response = await communityAPI.getCommunity(selectedCommunityChat._id);
      setCommunityDetails(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch community details:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
      const other = getOtherParticipant(c);
      return other?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    : conversations;
  const filteredCommunityChats = searchQuery.trim()
    ? communityChats.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : communityChats;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-blue)]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--synapse-bg)] animate-in fade-in duration-500">
      {/* Page Header - Glass panel with subtle gradient */}
      <div className="px-6 py-5 relative">
        <div className="absolute inset-0  border border-gray-500/30
    bg-gradient-to-r
    from-[var(--synapse-surface)]/40
    via-transparent
    to-[var(--synapse-surface)]/40
    shadow-[0_0_16px_rgba(0,0,0,0.35)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--synapse-text)] tracking-tight">Messages</h1>
            <p className="text-sm text-[var(--synapse-text-muted)] mt-0.5">Your conversations, synced in real-time</p>
          </div>

        </div>
        {/* Bottom gradient border */}
        {/* <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--synapse-border)] to-transparent" /> */}
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Conversation list - left card */}
        <div className="w-full md:w-[420px] h-[70vh] flex-shrink-0 rounded-md border border-[var(--synapse-border)] bg-[var(--synapse-surface)] shadow-lg overflow-hidden flex flex-col">
          <div className="p-4 bg-gradient-to-b from-[var(--synapse-surface-hover)]/40 to-transparent">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab('direct')}
                className={`
  relative px-5 py-2 text-sm font-semibold rounded-md
  transition-colors duration-150 cursor-pointer
  ${activeTab === 'direct'
                    ? `
        text-white
        bg-white/[0.04]
        border border-white/10
      `
                    : `
        text-[var(--synapse-text)]
        hover:text-white
      `
                  }
`}
              >
                Individuals
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`
  relative px-5 py-2 text-sm font-semibold rounded-md
  transition-colors duration-150 cursor-pointer
  ${activeTab === 'community'
                    ? `
        text-white
        bg-white/[0.04]
        border border-white/10
      `
                    : `
        text-[var(--synapse-text)]
        hover:text-white
      `
                  }
`}
              >
                Communities
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--synapse-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'community' ? 'Search communities...' : 'Search conversations...'}
                className="w-full pl-11 pr-4 py-3 rounded-md bg-[var(--synapse-bg)] border border-[var(--synapse-border)] text-[var(--synapse-text)] placeholder:text-[var(--synapse-text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--synapse-blue)]/40 focus:border-[var(--synapse-blue)] transition-all duration-200"
              />
            </div>
          </div>
          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--synapse-border)] to-transparent mx-4" />
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
            {activeTab === 'direct' ? (
              filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-[var(--synapse-text-muted)] text-sm">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{searchQuery ? 'No matches' : 'No conversations yet'}</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation);
                  const isSelected = selectedConversation?._id === conversation._id;
                  const isOnline = otherUser?._id && onlineUsers.has(otherUser._id);
                  return (
                    <motion.button
                      key={conversation._id}
                      onClick={() => handleSelectConversation(conversation)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: 0.15 }}
                      className={`w-full p-4 flex items-center gap-4 text-left transition-all duration-200 rounded-sm border ${isSelected ? 'bg-[var(--synapse-surface-hover)] border-[var(--synapse-border)]' : 'border-transparent hover:bg-[var(--synapse-surface-hover)] hover:border-[var(--synapse-border)]'}`}
                    >
                      <div className="relative flex-shrink-0">
                        <img src={otherUser?.avatar || '/default-avatar.jpg'} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-[var(--synapse-border)] ring-2 ring-[var(--synapse-surface)]" />
                        {isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--synapse-surface)] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--synapse-text)] truncate">{otherUser?.username}</p>
                          <span className="text-[10px] text-[var(--synapse-text-muted)] flex-shrink-0 font-medium">{formatListTime(conversation.updatedAt)}</span>
                        </div>
                        <p className="text-sm text-[var(--synapse-text-muted)] truncate mt-0.5">{conversation.lastMessage || 'No messages'}</p>
                      </div>
                    </motion.button>
                  );
                })
              )
            ) : (
              filteredCommunityChats.length === 0 ? (
                <div className="p-8 text-center text-[var(--synapse-text-muted)] text-sm">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{searchQuery ? 'No matches' : 'No community chats'}</p>
                  <p className="text-xs mt-1">Join a community to start chatting</p>
                </div>
              ) : (
                filteredCommunityChats.map((chat) => {
                  const isSelected = selectedCommunityChat?._id === chat._id;
                  return (
                    <motion.button
                      key={chat._id}
                      onClick={() => handleSelectCommunityChat(chat)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: 0.15 }}
                      className={`w-full p-4 flex items-center gap-4 text-left transition-all duration-200 rounded-md border ${isSelected ? 'bg-[var(--synapse-surface-hover)] border-[var(--synapse-border)]' : 'border-transparent hover:bg-[var(--synapse-surface-hover)] hover:border-[var(--synapse-border)]'}`}
                    >
                      {chat.avatar ? (
                        <img src={chat.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-[var(--synapse-border)] flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--synapse-surface-hover)] to-[var(--synapse-surface)] border-2 border-[var(--synapse-border)] flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--synapse-text)] truncate">{chat.name}</p>
                          <span className="text-[10px] text-[var(--synapse-text-muted)] flex-shrink-0 font-medium">{formatListTime(chat.updatedAt)}</span>
                        </div>
                        <p className="text-sm text-[var(--synapse-text-muted)] truncate mt-0.5">{chat.lastMessage || 'No messages yet'}</p>
                       
                      </div>
                    </motion.button>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Chat Window - right card */}
        <div className="flex-1 h-[70vh] flex flex-col rounded-md border border-[var(--synapse-border)] bg-[var(--synapse-surface)] shadow-lg min-w-0 overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header - Direct */}
              <div className="px-5 py-4 bg-gradient-to-b from-[var(--synapse-surface)] to-[var(--synapse-surface)]/80 backdrop-blur-sm flex items-center justify-between relative border-b border-[var(--synapse-border)]/50">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={getOtherParticipant(selectedConversation)?.avatar || '/default-avatar.jpg'}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border-2 border-[var(--synapse-border)] ring-2 ring-[var(--synapse-surface)]"
                    />
                    {getOtherParticipant(selectedConversation)?._id && onlineUsers.has(getOtherParticipant(selectedConversation)!._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--synapse-surface)] shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--synapse-text)] text-[15px]">{getOtherParticipant(selectedConversation)?.username}</p>
                    <p className="text-xs text-[var(--synapse-text-muted)] flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${getOtherParticipant(selectedConversation)?._id && onlineUsers.has(getOtherParticipant(selectedConversation)!._id) ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                      {getOtherParticipant(selectedConversation)?._id && onlineUsers.has(getOtherParticipant(selectedConversation)!._id) ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const otherUser = getOtherParticipant(selectedConversation);
                    return otherUser ? (
                      <>
                        <button type="button" onClick={() => startCall(otherUser._id, 'audio')} className="p-2.5 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-blue)] transition-all duration-200" title="Voice call"><Phone className="w-5 h-5" /></button>
                        
                      </>
                    ) : null;
                  })()}
                  <div className="relative">
                    <button type="button" onClick={() => setShowChatOptions(!showChatOptions)} className="p-2.5 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-all duration-200" aria-label="More options"><MoreHorizontal className="w-5 h-5" /></button>
                    {showChatOptions && (
                      <div className="absolute right-0 top-full mt-2 w-48 py-1.5 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-xl shadow-xl z-20">
                        <button
                          type="button"
                          onClick={() => { setShowChatOptions(false); toast.error('Delete conversation feature coming soon'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete conversation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {messages.length > 0 && (
                  <p className="text-center text-xs text-[var(--synapse-text-muted)] py-2">{new Date(messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {messages.map((message, idx) => {
                  const isOwn = message.sender._id === user?._id;
                  return (
                    <motion.div
                      key={message._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx < 10 ? idx * 0.03 : 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] lg:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${isOwn ? 'bg-[var(--synapse-surface-hover)] text-[var(--synapse-text)]' : 'bg-[var(--synapse-surface)]/80 backdrop-blur-sm border-2 border-[var(--synapse-border)] text-[var(--synapse-text)]'}`}>
                          {!isOwn && <p className="text-xs font-semibold text-gray-500 mb-0.5">{message.sender.username}</p>}
                          <p className="text-base break-words leading-relaxed">{message.content}</p>
                        </div>
                        <p className="text-[10px] mt-1 text-[var(--synapse-text-muted)] px-1">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </motion.div>
                  );
                })}
                {typing && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 rounded-xl bg-[var(--synapse-surface)] border border-[var(--synapse-border)]">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[var(--synapse-text-muted)] rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-[var(--synapse-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-2 h-2 bg-[var(--synapse-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="px-5 py-4 bg-[var(--synapse-surface)] border-t border-[var(--synapse-border)]/50">
                <div className="flex items-center gap-3">
                  <button type="button" className="p-2.5 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-all duration-200" aria-label="Attach file"><Paperclip className="w-5 h-5" /></button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => { setMessageInput(e.target.value); if (selectedConversation) handleTyping(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (messageInput.trim() && !sending) handleSendMessage(e as any); } }}
                    placeholder={`Message ${getOtherParticipant(selectedConversation)?.username || ''}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--synapse-bg)] border border-[var(--synapse-border)] text-[var(--synapse-text)] placeholder:text-[var(--synapse-text-muted)]/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--synapse-blue)]/30 focus:border-[var(--synapse-blue)]/50 transition-all duration-200"
                  />
                  <button type="submit" disabled={!messageInput.trim() || sending} className="p-2.5 rounded-lg bg-[var(--synapse-blue)] text-white hover:bg-[var(--synapse-blue)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200">
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : selectedCommunityChat ? (
            <>
              {/* Chat Header - Community */}
              <div className="p-4 bg-[var(--synapse-surface)]/80 backdrop-blur-sm flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                  {selectedCommunityChat.avatar ? (
                    <img src={selectedCommunityChat.avatar} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-[var(--synapse-border)]" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--synapse-surface-hover)] to-[var(--synapse-surface)] border-2 border-[var(--synapse-border)] flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-[var(--synapse-text)]">{selectedCommunityChat.name}</p>
                    <p className="text-xs text-[var(--synapse-text-muted)] flex items-center gap-1">
                      
                      {selectedCommunityChat.memberCount.toLocaleString()} members
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleShowMembers} className="p-2.5 rounded-xl hover:bg-[var(--synapse-surface-hover)]/80 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-all duration-200" title="View members"><Users className="w-5 h-5" /></button>
                  <button type="button" className="p-2.5 rounded-xl hover:bg-[var(--synapse-surface-hover)]/80 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-all duration-200" aria-label="More"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
                {/* Gradient bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--synapse-border)] to-transparent" />
              </div>

              {/* Community Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <div className="text-center text-[var(--synapse-text-muted)]">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-[var(--synapse-text)]">Welcome to {selectedCommunityChat.name}</p>
                      <p className="text-sm mt-1">Start chatting with community members!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-center text-xs text-[var(--synapse-text-muted)] py-2">{new Date(messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {messages.map((message) => {
                      const isOwn = message.sender._id === user?._id;
                      return (
                        <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {!isOwn && (
                            <img src={message.sender.avatar || '/default-avatar.jpg'} alt="" className="w-8 h-8 rounded-full object-cover border border-[var(--synapse-border)] mr-2 shrink-0 self-end" />
                          )}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[75%] lg:max-w-md px-4 py-2.5 rounded-xl ${isOwn ? 'bg-[var(--synapse-surface-hover)] text-[var(--synapse-text)]' : 'bg-[var(--synapse-surface)] border-2 border-[var(--synapse-border)] text-[var(--synapse-text)]'}`}>
                              {!isOwn && <p className="text-xs font-semibold text-gray-500 mb-0.5">{message.sender.username}</p>}
                              <p className="text-base break-words">{message.content}</p>
                            </div>
                            <p className="text-[10px] mt-1 text-[var(--synapse-text-muted)] px-1">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Community Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-[var(--synapse-surface)]/80 backdrop-blur-sm relative">
                {/* Gradient top border */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--synapse-border)] to-transparent" />
                <div className="flex items-center gap-2">
                  <button type="button" className="p-2.5 rounded-xl hover:bg-[var(--synapse-surface-hover)]/80 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-all duration-200" aria-label="Attach"><Paperclip className="w-5 h-5" /></button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message ${selectedCommunityChat.name}...`}
                    className="flex-1 px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/60 border border-[var(--synapse-border)]/60 text-[var(--synapse-text)] placeholder:text-[var(--synapse-text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--synapse-blue)]/40 focus:border-[var(--synapse-blue)] transition-all duration-200"
                  />
                  
                  <button type="submit" disabled={!messageInput.trim() || sending} className="p-2.5 rounded-lg bg-gradient-to-r from-[var(--synapse-blue)] to-blue-500 text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg">
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center px-8"
              >
                <h2 className="text-5xl font-bold text-[var(--synapse-text)] mb-3">Start a conversation</h2>
                <p className="text-xl text-[var(--synapse-text-muted)] max-w-sm mx-auto leading-relaxed">
                  Select a chat from the list or switch to Communities to message a group..
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Call UI */}
      {isCallIncoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[var(--synapse-active)] flex items-center justify-center mx-auto mb-4">
                {callType === 'video' ? <Video className="w-10 h-10 text-[var(--synapse-blue)]" /> : <Phone className="w-10 h-10 text-[var(--synapse-blue)]" />}
              </div>
              <h3 className="text-xl font-bold text-[var(--synapse-text)] mb-2">Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</h3>
              <p className="text-[var(--synapse-text-muted)]">from {callerId}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={rejectCall} className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-semibold transition-colors">Decline</button>
              <button onClick={answerCall} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-semibold transition-colors">Answer</button>
            </div>
          </div>
        </div>
      )}

      {isCallActive && (
        <div className="fixed inset-0 z-50 bg-[var(--synapse-bg)] flex flex-col">
          {callType === 'video' ? (
            <div className="flex-1 relative">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 w-48 h-64 rounded-xl overflow-hidden border-2 border-[var(--synapse-border)]">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-[var(--synapse-active)] flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-16 h-16 text-[var(--synapse-blue)]" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--synapse-text)] mb-2">Audio Call</h3>
                <p className="text-[var(--synapse-text-muted)]">Call in progress...</p>
              </div>
            </div>
          )}
          <div className="p-6 flex justify-center">
            <button onClick={endCall} className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors">
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Members Modal */}
      <AnimatePresence>
        {showMembersModal && communityDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMembersModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] w-full max-w-md rounded-md overflow-hidden shadow-2xl relative z-10 max-h-[80vh] flex flex-col"
            >
              <div className="p-3 border-b border-[var(--synapse-border)] flex items-center justify-between bg-[var(--synapse-surface-hover)]/40">
                <h2 className="text-lg font-semibold text-[var(--synapse-text)] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--synapse-white)]" />
                  Members ({communityDetails.membersCount || 0})
                </h2>
                <button onClick={() => setShowMembersModal(false)} className="p-2 hover:bg-[var(--synapse-surface-hover)] rounded-md text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-blue)]" />
                  </div>
                ) : (
                  <>
                    {communityDetails.creator && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[var(--synapse-text-muted)] uppercase tracking-wider px-2">Owner</div>
                        <div className="p-3 rounded-md bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] flex items-center gap-3">
                          <div className="relative">
                            <img src={communityDetails.creator.avatar || '/default-avatar.jpg'} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)]" />
                            {onlineUsers.has(communityDetails.creator._id) && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--synapse-surface)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--synapse-text)] truncate">{communityDetails.creator.username}</span>
                              <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            </div>
                            <p className="text-xs text-[var(--synapse-text-muted)]">{onlineUsers.has(communityDetails.creator._id) ? 'Online' : 'Offline'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {communityDetails.admins && communityDetails.admins.filter((a: any) => a._id !== communityDetails.creator?._id).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[var(--synapse-text-muted)] uppercase tracking-wider px-2">Admins</div>
                        {communityDetails.admins.filter((admin: any) => admin._id !== communityDetails.creator?._id).map((admin: any) => (
                          <div key={admin._id} className="p-3 rounded-md bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] flex items-center gap-3">
                            <div className="relative">
                              <img src={admin.avatar || '/default-avatar.jpg'} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)]" />
                              {onlineUsers.has(admin._id) && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--synapse-surface)]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--synapse-text)] truncate">{admin.username}</span>
                                <Shield className="w-4 h-4 text-[var(--synapse-blue)] flex-shrink-0" />
                              </div>
                              <p className="text-xs text-[var(--synapse-text-muted)]">{onlineUsers.has(admin._id) ? 'Online' : 'Offline'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {communityDetails.members && communityDetails.members.filter((m: any) => m._id !== communityDetails.creator?._id && !communityDetails.admins?.some((a: any) => a._id === m._id)).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[var(--synapse-text-muted)] uppercase tracking-wider px-2">Members</div>
                        {communityDetails.members.filter((member: any) => member._id !== communityDetails.creator?._id && !communityDetails.admins?.some((a: any) => a._id === member._id)).map((member: any) => (
                          <div key={member._id} className="p-3 rounded-md bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] flex items-center gap-3">
                            <div className="relative">
                              <img src={member.avatar || '/default-avatar.jpg'} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)]" />
                              {onlineUsers.has(member._id) && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--synapse-surface)]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[var(--synapse-text)] truncate">{member.username}</p>
                              <p className="text-xs text-[var(--synapse-text-muted)]">{onlineUsers.has(member._id) ? 'Online' : 'Offline'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

