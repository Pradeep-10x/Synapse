import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messageAPI, communityAPI, communityChatAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Send, Phone, Video, Loader2, Circle, Users, MessageCircle, X, PhoneOff, Crown, Shield } from 'lucide-react';
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
  memberCount: number;
  lastMessage?: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { socket, onlineUsers } = useSocketStore();
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
  const [showMembersModal, setShowMembersModal] = useState(false);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Conversations List */}
      <div className="w-full md:w-80 border-r border-[rgba(168,85,247,0.15)] glass-panel flex flex-col">
        <div className="p-4 border-b border-[rgba(168,85,247,0.15)]">
          <h2 className="text-xl font-bold text-[#e5e7eb] mb-3">Messages</h2>
          {/* Tabs for Direct vs Community */}
          <div className="flex gap-1 p-1 glass-card rounded-lg">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'direct'
                ? 'bg-[#7c3aed] text-white'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
            >
              <MessageCircle className="w-4 h-4" />
              Direct
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'community'
                ? 'bg-[#7c3aed] text-white'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
            >
              <Users className="w-4 h-4" />
              Community
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'direct' ? (
            // Direct Messages List
            conversations.length === 0 ? (
              <div className="p-4 text-center text-[#9ca3af]">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-[#374151]" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                const isSelected = selectedConversation?._id === conversation._id;
                return (
                  <button
                    key={conversation._id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-[rgba(168,85,247,0.1)] transition-colors border-b border-[rgba(168,85,247,0.05)] ${isSelected ? 'bg-[rgba(168,85,247,0.15)]' : ''
                      }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
                        <img
                          src={otherUser?.avatar || "/default-avatar.jpg"}
                          alt={otherUser?.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Circle className="w-3 h-3 absolute bottom-0 right-0 text-green-500 fill-green-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-[#e5e7eb] truncate">{otherUser?.username}</div>
                      <div className="text-sm text-[#9ca3af] truncate">{conversation.lastMessage || 'No messages'}</div>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            // Community Chats List
            communityChats.length === 0 ? (
              <div className="p-4 text-center text-[#9ca3af]">
                <Users className="w-12 h-12 mx-auto mb-2 text-[#374151]" />
                <p>No community chats</p>
                <p className="text-sm text-[#6b7280] mt-1">Join a community to start chatting</p>
              </div>
            ) : (
              communityChats.map((chat) => {
                const isSelected = selectedCommunityChat?._id === chat._id;
                return (
                  <button
                    key={chat._id}
                    onClick={() => handleSelectCommunityChat(chat)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-[rgba(168,85,247,0.1)] transition-colors border-b border-[rgba(168,85,247,0.05)] ${isSelected ? 'bg-[rgba(168,85,247,0.15)]' : ''
                      }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#a855f7]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-[#e5e7eb] truncate">{chat.name}</div>
                      <div className="text-sm text-[#9ca3af] truncate">{chat.lastMessage || 'No messages yet'}</div>
                      <div className="text-xs text-[#6b7280] mt-0.5">{chat.memberCount.toLocaleString()} members</div>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header - Direct Message */}
            <div className="p-4 border-b border-[rgba(168,85,247,0.15)] glass-panel flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
                  <img
                    src={getOtherParticipant(selectedConversation)?.avatar || "/default-avatar.jpg"}
                    alt={getOtherParticipant(selectedConversation)?.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-semibold text-[#e5e7eb]">
                    {getOtherParticipant(selectedConversation)?.username}
                  </div>
                  <div className="text-xs text-[#9ca3af] flex items-center gap-1">
                    {(() => {
                      const otherUser = getOtherParticipant(selectedConversation);
                      const isOnline = otherUser?._id && onlineUsers.has(otherUser._id);
                      return (
                        <>
                          <Circle className={`w-2 h-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`} />
                          {isOnline ? 'Online' : 'Offline'}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const otherUser = getOtherParticipant(selectedConversation);
                  return otherUser ? (
                    <>
                      <button
                        onClick={() => startCall(otherUser._id, 'audio')}
                        disabled={isCallActive || isCallIncoming}
                        className="p-2 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors disabled:opacity-50"
                        title="Audio Call"
                      >
                        <Phone className="w-5 h-5 text-[#9ca3af]" />
                      </button>
                      <button
                        onClick={() => startCall(otherUser._id, 'video')}
                        disabled={isCallActive || isCallIncoming}
                        className="p-2 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors disabled:opacity-50"
                        title="Video Call"
                      >
                        <Video className="w-5 h-5 text-[#9ca3af]" />
                      </button>
                    </>
                  ) : null;
                })()}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 glass-card rounded-lg hover:border-[rgba(239,68,68,0.4)] hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9ca3af]" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender._id === user?._id;
                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                        ? 'bg-[#7c3aed] text-white'
                        : 'glass-card text-[#e5e7eb]'
                        }`}
                    >
                      {!isOwn && (
                        <div className="text-xs font-semibold mb-1">{message.sender.username}</div>
                      )}
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#9ca3af]'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="flex justify-start">
                  <div className="glass-card px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(168,85,247,0.15)] glass-panel">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    if (selectedConversation) {
                      handleTyping();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageInput.trim() && !sending) {
                        handleSendMessage(e as any);
                      }
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.5)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="p-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : selectedCommunityChat ? (
          <>
            {/* Chat Header - Community */}
            <div className="p-4 border-b border-[rgba(168,85,247,0.15)] glass-panel flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#a855f7]" />
                </div>
                <div>
                  <div className="font-semibold text-[#e5e7eb]">
                    {selectedCommunityChat.name}
                  </div>
                  <div className="text-xs text-[#9ca3af] flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    {selectedCommunityChat.memberCount.toLocaleString()} members
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShowMembers}
                  className="p-2 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors"
                  title="View members"
                >
                  <Users className="w-5 h-5 text-[#9ca3af]" />
                </button>
                <button
                  onClick={() => setSelectedCommunityChat(null)}
                  className="p-2 glass-card rounded-lg hover:border-[rgba(239,68,68,0.4)] hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9ca3af]" />
                </button>
              </div>
            </div>

            {/* Community Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center text-[#9ca3af]">
                    <Users className="w-12 h-12 mx-auto mb-2 text-[#374151]" />
                    <p className="text-lg mb-2">Welcome to {selectedCommunityChat.name}</p>
                    <p className="text-sm">Start chatting with community members!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender._id === user?._id;
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden mr-2 shrink-0">
                          <img
                            src={message.sender.avatar || "/default-avatar.jpg"}
                            alt={message.sender.username}
                            className="w-full h-full object-cover scale-110"
                          />
                        </div>
                      )}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                          ? 'bg-[#7c3aed] text-white'
                          : 'glass-card text-[#e5e7eb]'
                          }`}
                      >
                        {!isOwn && (
                          <div className="text-xs font-semibold mb-1 text-[#a855f7]">{message.sender.username}</div>
                        )}
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#9ca3af]'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Community Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(168,85,247,0.15)] glass-panel">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message ${selectedCommunityChat.name}...`}
                  className="flex-1 px-4 py-3 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.5)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="p-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[#9ca3af]">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-[#a855f7]" />
              </div>
              <p className="text-xl font-semibold text-[#e5e7eb] mb-2">Start a new chat</p>
              <p className="text-sm max-w-xs">Select a conversation from the sidebar or search for someone to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Call UI */}
      {isCallIncoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a12] border border-[rgba(168,85,247,0.2)] rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[#7c3aed]/20 flex items-center justify-center mx-auto mb-4">
                {callType === 'video' ? (
                  <Video className="w-10 h-10 text-[#a855f7]" />
                ) : (
                  <Phone className="w-10 h-10 text-[#a855f7]" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
              </h3>
              <p className="text-[#9ca3af]">from {callerId}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={rejectCall}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold transition-colors"
              >
                Decline
              </button>
              <button
                onClick={answerCall}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold transition-colors"
              >
                Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {isCallActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {callType === 'video' ? (
            <>
              <div className="flex-1 relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 w-48 h-64 rounded-lg overflow-hidden border-2 border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-[#7c3aed]/20 flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-16 h-16 text-[#a855f7]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Audio Call</h3>
                <p className="text-[#9ca3af]">Call in progress...</p>
              </div>
            </div>
          )}
          <div className="p-6 flex justify-center">
            <button
              onClick={endCall}
              className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Members Modal */}
      <AnimatePresence>
        {showMembersModal && communityDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembersModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a12] border border-[rgba(168,85,247,0.2)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-[rgba(168,85,247,0.1)] flex items-center justify-between bg-[rgba(168,85,247,0.02)]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#a855f7]" />
                  Members ({communityDetails.membersCount || 0})
                </h2>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-[#9ca3af] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />
                  </div>
                ) : (
                  <>
                    {/* Owner */}
                    {communityDetails.creator && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider px-2">
                          Owner
                        </div>
                        <div className="glass-card p-3 rounded-lg flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
                              <img
                                src={communityDetails.creator.avatar || "/default-avatar.jpg"}
                                alt={communityDetails.creator.username}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {onlineUsers.has(communityDetails.creator._id) && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a12]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#e5e7eb] truncate">
                                {communityDetails.creator.username}
                              </span>
                              <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            </div>
                            <div className="text-xs text-[#9ca3af] flex items-center gap-1">
                              <Circle className={`w-2 h-2 ${onlineUsers.has(communityDetails.creator._id) ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`} />
                              {onlineUsers.has(communityDetails.creator._id) ? 'Online' : 'Offline'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admins */}
                    {communityDetails.admins && communityDetails.admins.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider px-2">
                          Admins ({communityDetails.admins.filter((admin: any) => admin._id !== communityDetails.creator?._id).length})
                        </div>
                        {communityDetails.admins
                          .filter((admin: any) => admin._id !== communityDetails.creator?._id)
                          .map((admin: any) => (
                            <div key={admin._id} className="glass-card p-3 rounded-lg flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-[#7c3aed] flex items-center justify-center overflow-hidden">
                                  <img
                                    src={admin.avatar || "/default-avatar.jpg"}
                                    alt={admin.username}
                                    className="w-full h-full object-cover scale-110"
                                  />
                                </div>
                                {onlineUsers.has(admin._id) && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a12]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[#e5e7eb] truncate">
                                    {admin.username}
                                  </span>
                                  <Shield className="w-4 h-4 text-[#a855f7] flex-shrink-0" />
                                </div>
                                <div className="text-xs text-[#9ca3af] flex items-center gap-1">
                                  <Circle className={`w-2 h-2 ${onlineUsers.has(admin._id) ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`} />
                                  {onlineUsers.has(admin._id) ? 'Online' : 'Offline'}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Members */}
                    {communityDetails.members && communityDetails.members.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider px-2">
                          Members ({communityDetails.members.filter((m: any) =>
                            m._id !== communityDetails.creator?._id &&
                            !communityDetails.admins?.some((a: any) => a._id === m._id)
                          ).length})
                        </div>
                        {communityDetails.members
                          .filter((member: any) =>
                            member._id !== communityDetails.creator?._id &&
                            !communityDetails.admins?.some((a: any) => a._id === member._id)
                          )
                          .map((member: any) => (
                            <div key={member._id} className="glass-card p-3 rounded-lg flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-[#374151] flex items-center justify-center overflow-hidden">
                                  <img
                                    src={member.avatar || "/default-avatar.jpg"}
                                    alt={member.username}
                                    className="w-full h-full object-cover scale-110"
                                  />
                                </div>
                                {onlineUsers.has(member._id) && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a12]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[#e5e7eb] truncate">
                                  {member.username}
                                </div>
                                <div className="text-xs text-[#9ca3af] flex items-center gap-1">
                                  <Circle className={`w-2 h-2 ${onlineUsers.has(member._id) ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`} />
                                  {onlineUsers.has(member._id) ? 'Online' : 'Offline'}
                                </div>
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

